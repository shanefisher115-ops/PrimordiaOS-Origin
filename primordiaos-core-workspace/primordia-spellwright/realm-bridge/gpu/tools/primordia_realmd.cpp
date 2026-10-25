// primordia_realmd: the standalone PrimordiaOS GPU realm engine.
//
//   primordia_realmd --frames 600 --png out.png          headless run, saves the last frame
//   primordia_realmd --window                            live window (Win32 swapchain)
//   primordia_realmd --stdio                             sidecar for the realm bridge:
//       stdin  (JSON lines): {"type":"manifest","manifest":{PRS-1}}  {"type":"metaphysics",...}
//                            {"type":"actors","count":N}  {"type":"quality","scale":s}
//                            {"type":"budget","ms":x}  {"type":"snapshot","path":"..."}  {"type":"quit"}
//       stdout (JSON lines): {"type":"ready",...}  {"type":"telemetry",...Onyx frame...}
//                            {"type":"mcp_results",...}  {"type":"ack",...}  {"type":"error",...}
// Options: --validation --actors N --manifest file.json --budget-ms X --telemetry-hz H
//          --width W --height H --shaders DIR --device NAME --no-vsync --dt S (fixed step)
#include "primordia/gpu/Json.h"
#include "primordia/gpu/RealmLoop.h"

#include <atomic>
#include <chrono>
#include <cstdio>
#include <cstring>
#include <fstream>
#include <iostream>
#include <mutex>
#include <sstream>
#include <string>
#include <thread>
#include <vector>

#ifdef _WIN32
#ifndef NOMINMAX
#define NOMINMAX
#endif
#include <windows.h>
#endif

using namespace primordia::gpu;

namespace
{
const char* const ActionNames[MCP_ACTION_COUNT] = { "idle", "wander", "seek_sigil", "flee", "rest", "commune" };

std::string ExeDirectory()
{
#ifdef _WIN32
	char Path[MAX_PATH];
	const DWORD Len = GetModuleFileNameA(nullptr, Path, MAX_PATH);
	std::string S(Path, Len);
	const size_t Slash = S.find_last_of("\\/");
	return Slash == std::string::npos ? "." : S.substr(0, Slash);
#else
	return ".";
#endif
}

struct Args
{
	RealmLoopOptions Loop;
	uint32_t Frames = 0; // 0 = until quit / window closed
	std::string Png;
	std::string Manifest;
	bool bStdio = false;
	double TelemetryHz = 4.0;
	float FixedDt = 0.f;
};

bool ParseArgs(int Argc, char** Argv, Args& Out)
{
	Out.Loop.ShaderDir = ExeDirectory() + "/shaders";
	for (int I = 1; I < Argc; ++I)
	{
		const std::string A = Argv[I];
		auto Next = [&](const char* What) -> std::string
		{
			if (I + 1 >= Argc)
			{
				std::fprintf(stderr, "%s needs a value\n", What);
				std::exit(2);
			}
			return Argv[++I];
		};
		if (A == "--frames") Out.Frames = static_cast<uint32_t>(std::stoul(Next("--frames")));
		else if (A == "--png") Out.Png = Next("--png");
		else if (A == "--manifest") Out.Manifest = Next("--manifest");
		else if (A == "--window") Out.Loop.bWindow = true;
		else if (A == "--no-vsync") Out.Loop.bVsync = false;
		else if (A == "--stdio") Out.bStdio = true;
		else if (A == "--validation") Out.Loop.bValidation = true;
		else if (A == "--actors") Out.Loop.Actors = static_cast<uint32_t>(std::stoul(Next("--actors")));
		else if (A == "--budget-ms") Out.Loop.BudgetMs = std::stod(Next("--budget-ms"));
		else if (A == "--telemetry-hz") Out.TelemetryHz = std::stod(Next("--telemetry-hz"));
		else if (A == "--width") Out.Loop.Width = static_cast<uint32_t>(std::stoul(Next("--width")));
		else if (A == "--height") Out.Loop.Height = static_cast<uint32_t>(std::stoul(Next("--height")));
		else if (A == "--shaders") Out.Loop.ShaderDir = Next("--shaders");
		else if (A == "--device") Out.Loop.PreferredDevice = Next("--device");
		else if (A == "--dt") Out.FixedDt = std::stof(Next("--dt"));
		else
		{
			std::fprintf(stderr, "unknown option %s\n", A.c_str());
			return false;
		}
	}
	return true;
}

/** Reads stdin lines on a thread so the frame loop never blocks on PrimordiaOS. */
class LineReader
{
public:
	LineReader()
	{
		Thread = std::thread([this]
		{
			std::string Line;
			while (std::getline(std::cin, Line))
			{
				std::lock_guard<std::mutex> Lock(Mutex);
				Lines.push_back(std::move(Line));
			}
			bEof = true;
		});
		Thread.detach(); // std::getline cannot be interrupted; the process exit ends it
	}
	std::vector<std::string> Drain()
	{
		std::lock_guard<std::mutex> Lock(Mutex);
		std::vector<std::string> Out;
		Out.swap(Lines);
		return Out;
	}
	bool Eof() const { return bEof.load(); }

private:
	std::thread Thread;
	std::mutex Mutex;
	std::vector<std::string> Lines;
	std::atomic<bool> bEof{ false };
};

void Emit(const Json& J)
{
	const std::string Line = J.Dump();
	std::fwrite(Line.data(), 1, Line.size(), stdout);
	std::fputc('\n', stdout);
	std::fflush(stdout);
}

Json ResultsJson(const MCPResults& R)
{
	Json Actions;
	for (uint32_t A = 0; A < MCP_ACTION_COUNT; ++A)
	{
		Actions.Set(ActionNames[A], R.Actions[A]);
	}
	double Recall = 0.0, Fear = 0.0;
	for (size_t I = 0; I < R.Recall.size(); ++I)
	{
		Recall += R.Recall[I].Value.x;
		Fear += R.Actors[I].Drives.z;
	}
	const double N = static_cast<double>(std::max<size_t>(1, R.Recall.size()));
	Json J;
	J.Set("type", "mcp_results");
	J.Set("tick", R.Tick);
	J.Set("actors", static_cast<uint32_t>(R.Actors.size()));
	J.Set("actions", Actions);
	J.Set("structures", R.Structures);
	J.Set("episodes_stored", R.EpisodesStored);
	J.Set("mean_recall", std::round(Recall / N * 1000.0) / 1000.0);
	J.Set("mean_fear", std::round(Fear / N * 1000.0) / 1000.0);
	return J;
}

Json Ack(const std::string& Command, bool bOk, const std::string& Error = {})
{
	Json J;
	J.Set("type", "ack");
	J.Set("command", Command);
	J.Set("ok", bOk);
	if (!Error.empty())
	{
		J.Set("error", Error);
	}
	return J;
}

/** Applies one PrimordiaOS message. Returns false on quit. */
bool HandleLine(RealmLoop& Loop, const std::string& Line, std::string& SnapshotPath)
{
	std::string Error;
	const Json Msg = Json::Parse(Line, &Error);
	if (!Error.empty())
	{
		Json E;
		E.Set("type", "error");
		E.Set("message", "bad JSON: " + Error);
		Emit(E);
		return true;
	}
	const std::string Type = Msg.GetString("type");
	if (Type == "quit")
	{
		return false;
	}
	if (Type == "manifest")
	{
		const bool bOk = Loop.ApplyManifest(Msg["manifest"], Error);
		Emit(Ack("manifest", bOk, Error));
	}
	else if (Type == "metaphysics")
	{
		Loop.ApplyMetaphysics(Msg["metaphysics"]);
	}
	else if (Type == "actors")
	{
		Loop.SpawnActors(static_cast<uint32_t>(std::max(0.0, Msg.Get("count", 0))));
		Emit(Ack("actors", true));
	}
	else if (Type == "quality")
	{
		Loop.SetQuality(Msg.Get("scale", 1.0));
		Json A = Ack("quality", true);
		A.Set("scale", Loop.Quality());
		Emit(A);
	}
	else if (Type == "budget")
	{
		Loop.SetBudgetMs(std::max(1.0, Msg.Get("ms", 16.667)));
		Emit(Ack("budget", true));
	}
	else if (Type == "snapshot")
	{
		SnapshotPath = Msg.GetString("path");
	}
	else
	{
		Emit(Ack(Type, false, "unknown message type"));
	}
	return true;
}
} // namespace

int main(int Argc, char** Argv)
{
	Args A;
	if (!ParseArgs(Argc, Argv, A))
	{
		return 2;
	}
	try
	{
		RealmLoop Loop(A.Loop);
		if (!A.Manifest.empty())
		{
			std::ifstream File(A.Manifest, std::ios::binary);
			std::stringstream Text;
			Text << File.rdbuf();
			std::string Error;
			const Json M = Json::Parse(Text.str(), &Error);
			if (!Error.empty() || !Loop.ApplyManifest(M, Error))
			{
				std::fprintf(stderr, "manifest %s: %s\n", A.Manifest.c_str(), Error.c_str());
				return 1;
			}
		}

		VulkanContext& Ctx = Loop.Context();
		{
			Json Queues;
			for (uint32_t R = 0; R < QueueRoleCount; ++R)
			{
				const QueueInfo& Q = Ctx.Queue(static_cast<QueueRole>(R));
				Json Info;
				Info.Set("family", Q.Family);
				Info.Set("index", Q.Index);
				Info.Set("dedicated", Q.bDedicated);
				Info.Set("separate_family", Q.bSeparateFamily);
				Queues.Set(QueueRoleName(static_cast<QueueRole>(R)), Info);
			}
			Json Ready;
			Ready.Set("type", "ready");
			Ready.Set("device", Ctx.DeviceName());
			Ready.Set("realm_id", Loop.Realm().RealmId);
			Ready.Set("actors", Loop.PopulationSize());
			Ready.Set("queues", Queues);
			Ready.Set("memory_budget_ext", Ctx.Caps().bMemoryBudget);
			Ready.Set("pipeline_statistics", Ctx.Caps().bPipelineStatistics);
			if (A.bStdio)
			{
				Emit(Ready);
			}
			else
			{
				std::fprintf(stderr, "%s\n", Ready.Dump().c_str());
			}
		}

		std::unique_ptr<LineReader> Reader;
		if (A.bStdio)
		{
			Reader = std::make_unique<LineReader>();
		}
		using Clock = std::chrono::steady_clock;
		auto Last = Clock::now();
		auto LastTelemetry = Last;
		const auto TelemetryPeriod = std::chrono::duration<double>(1.0 / std::max(0.1, A.TelemetryHz));
		const auto FramePeriod = std::chrono::duration<double>(A.Loop.BudgetMs / 1000.0);
		std::string SnapshotPath;
		uint32_t Frame = 0;
		bool bRunning = true;
		while (bRunning && (A.Frames == 0 || Frame < A.Frames))
		{
			if (Reader)
			{
				for (const std::string& Line : Reader->Drain())
				{
					if (!Line.empty() && !HandleLine(Loop, Line, SnapshotPath))
					{
						bRunning = false;
					}
				}
				if (Reader->Eof())
				{
					bRunning = false; // the realm bridge went away
				}
			}
			const auto Now = Clock::now();
			const float Dt = A.FixedDt > 0.f ? A.FixedDt : static_cast<float>(std::chrono::duration<double>(Now - Last).count());
			Last = Now;
			if (!Loop.Step(Frame == 0 ? 1.f / 60.f : Dt))
			{
				break;
			}
			++Frame;

			if (!SnapshotPath.empty() && Loop.SaveFrame(SnapshotPath))
			{
				Json Saved = Ack("snapshot", true);
				Saved.Set("path", SnapshotPath);
				Emit(Saved);
				SnapshotPath.clear();
			}
			if (A.bStdio && Clock::now() - LastTelemetry >= TelemetryPeriod)
			{
				LastTelemetry = Clock::now();
				Json T = Onyx::ToJson(Loop.LastTelemetry());
				T.Set("type", "telemetry");
				T.Set("source", "vulkan-sidecar");
				T.Set("quality", Loop.Quality());
				Emit(T);
				if (Loop.LastResults())
				{
					Emit(ResultsJson(*Loop.LastResults()));
				}
			}
			// Headless and sidecar modes pace themselves to the frame budget; a window paces
			// on present (FIFO).
			if (!A.Loop.bWindow && A.FixedDt <= 0.f)
			{
				const auto Spent = Clock::now() - Now;
				if (Spent < FramePeriod)
				{
					std::this_thread::sleep_for(FramePeriod - Spent);
				}
			}
		}

		vkDeviceWaitIdle(Ctx.Device());
		if (!A.Png.empty())
		{
			if (!Loop.SaveFrame(A.Png))
			{
				std::fprintf(stderr, "could not save %s\n", A.Png.c_str());
				return 1;
			}
			std::fprintf(stderr, "saved %s\n", A.Png.c_str());
		}
		const OnyxFrame& F = Loop.LastTelemetry();
		std::fprintf(stderr, "frames=%u tick=%llu gpu=%.3fms (mcp %.3f, render %.3f) actors=%u structures=%u validation: %u errors, %u warnings\n",
			Frame, static_cast<unsigned long long>(Loop.Realm().Tick), F.FrameGpuMs, F.RealmTickGpuMs, F.RenderGpuMs, F.ActorCount, F.Structures,
			Ctx.ValidationErrors(), Ctx.ValidationWarnings());
		if (!A.bStdio)
		{
			std::fprintf(stderr, "%s\n", Onyx::ToJson(F).Dump().c_str());
		}
		return Ctx.ValidationErrors() == 0 ? 0 : 3;
	}
	catch (const std::exception& E)
	{
		std::fprintf(stderr, "fatal: %s\n", E.what());
		if (A.bStdio)
		{
			Json Err;
			Err.Set("type", "error");
			Err.Set("message", E.what());
			Emit(Err);
		}
		return 1;
	}
}
