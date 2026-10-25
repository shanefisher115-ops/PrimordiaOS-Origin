// Behavior trees for the MCP cognition kernel (header-only C++17, shared by the standalone
// Vulkan engine, the Unreal MCPComputeBridge module and the tests).
//
// A GPU thread cannot keep a call stack per actor, so trees are compiled into a threaded
// form: every node knows where to go next on success and on failure. Selectors and
// sequences disappear into those links:
//   Sequence(c1..cn): ci's success -> c(i+1), any failure -> the sequence's failure.
//   Selector(c1..cn): ci's failure -> c(i+1), any success -> the selector's success.
//   Condition: tests one blackboard input against a threshold.
//   Action: terminal. Reaching it commits the actor to that action for this tick.
// The kernel then walks the array with a bounded loop (MCP_BT_MAX_STEPS), which is the
// whole interpreter. EvaluateCPU below is the reference the GPU result is tested against.
#pragma once

#include "MCPTypes.ush"

#include <cstdint>
#include <string>
#include <utility>
#include <vector>

namespace PrimordiaMCP
{
struct BTNode
{
	enum class EKind : uint8_t { Selector, Sequence, Condition, Action };

	EKind Kind = EKind::Action;
	uint32_t Input = 0;      // MCP_IN_* (Condition)
	uint32_t Compare = 0;    // MCP_BT_CMP_* (Condition)
	float Threshold = 0.f;   // (Condition)
	uint32_t ActionId = 0;   // MCP_ACTION_* (Action)
	std::vector<BTNode> Children;

	static BTNode Selector(std::vector<BTNode> Children)
	{
		BTNode N;
		N.Kind = EKind::Selector;
		N.Children = std::move(Children);
		return N;
	}
	static BTNode Sequence(std::vector<BTNode> Children)
	{
		BTNode N;
		N.Kind = EKind::Sequence;
		N.Children = std::move(Children);
		return N;
	}
	static BTNode Greater(uint32_t Input, float Threshold)
	{
		BTNode N;
		N.Kind = EKind::Condition;
		N.Input = Input;
		N.Compare = MCP_BT_CMP_GREATER;
		N.Threshold = Threshold;
		return N;
	}
	static BTNode Less(uint32_t Input, float Threshold)
	{
		BTNode N = Greater(Input, Threshold);
		N.Compare = MCP_BT_CMP_LESS;
		return N;
	}
	static BTNode Do(uint32_t ActionId)
	{
		BTNode N;
		N.Kind = EKind::Action;
		N.ActionId = ActionId;
		return N;
	}
};

/** Appends compiled trees to one shared node array (all actors' trees live in one buffer). */
class BTCompiler
{
public:
	/** Compiles Root and returns the index of its entry node. */
	uint32_t Compile(const BTNode& Root)
	{
		return CompileNode(Root, MCP_BT_END, MCP_BT_END);
	}

	const std::vector<FBTNodeGPU>& Nodes() const { return CompiledNodes; }

	/** Empty when every tree compiled cleanly. Invalid nodes compile to MCP_BT_END (the actor idles). */
	const std::string& Error() const { return LastError; }

private:
	uint32_t Emit(uint32_t Type, uint32_t Input, uint32_t OnSuccess, uint32_t OnFailure, float Threshold, float Compare, float ActionId)
	{
		FBTNodeGPU N{};
		N.Op = uint4{ Type, Input, OnSuccess, OnFailure };
		N.Arg = float4{ Threshold, Compare, ActionId, 0.f };
		CompiledNodes.push_back(N);
		return static_cast<uint32_t>(CompiledNodes.size() - 1);
	}

	uint32_t CompileNode(const BTNode& Node, uint32_t OnSuccess, uint32_t OnFailure)
	{
		switch (Node.Kind)
		{
		case BTNode::EKind::Condition:
			if (Node.Input >= MCP_IN_COUNT)
			{
				LastError = "behavior tree condition reads an unknown input";
				return MCP_BT_END;
			}
			return Emit(MCP_BT_CONDITION, Node.Input, OnSuccess, OnFailure, Node.Threshold, static_cast<float>(Node.Compare), 0.f);
		case BTNode::EKind::Action:
			if (Node.ActionId >= MCP_ACTION_COUNT)
			{
				LastError = "behavior tree action is not an MCP action";
				return MCP_BT_END;
			}
			return Emit(MCP_BT_ACTION, 0, MCP_BT_END, MCP_BT_END, 0.f, 0.f, static_cast<float>(Node.ActionId));
		case BTNode::EKind::Sequence:
		{
			// Compile back to front so each child knows its successor's entry.
			uint32_t Next = OnSuccess;
			for (auto It = Node.Children.rbegin(); It != Node.Children.rend(); ++It)
			{
				Next = CompileNode(*It, Next, OnFailure);
			}
			return Next;
		}
		case BTNode::EKind::Selector:
		default:
		{
			uint32_t Next = OnFailure;
			for (auto It = Node.Children.rbegin(); It != Node.Children.rend(); ++It)
			{
				Next = CompileNode(*It, OnSuccess, Next);
			}
			return Next;
		}
		}
	}

	std::vector<FBTNodeGPU> CompiledNodes;
	std::string LastError;
};

/** CPU reference of the kernel's walk (MCPEvaluateTree in MCPCognition.ush). */
inline uint32_t EvaluateCPU(const std::vector<FBTNodeGPU>& Nodes, uint32_t Root, const float (&Inputs)[MCP_IN_COUNT], uint32_t* OutVisited = nullptr)
{
	uint32_t Node = Root;
	uint32_t Action = MCP_ACTION_IDLE;
	uint32_t Visited = 0;
	for (uint32_t Step = 0; Step < MCP_BT_MAX_STEPS; ++Step)
	{
		if (Node == MCP_BT_END || Node >= Nodes.size())
		{
			break;
		}
		const FBTNodeGPU& B = Nodes[Node];
		++Visited;
		if (B.Op.x == MCP_BT_ACTION)
		{
			const uint32_t Id = static_cast<uint32_t>(B.Arg.z + 0.5f);
			Action = Id < MCP_ACTION_COUNT ? Id : MCP_ACTION_COUNT - 1;
			break;
		}
		const float Value = Inputs[B.Op.y < MCP_IN_COUNT ? B.Op.y : MCP_IN_COUNT - 1];
		const bool bPass = B.Arg.y < 0.5f ? (Value > B.Arg.x) : (Value < B.Arg.x);
		Node = bPass ? B.Op.z : B.Op.w;
	}
	if (OutVisited)
	{
		*OutVisited = Visited;
	}
	return Action;
}

/** The two archetypes PrimordiaOS realms are populated with. */
struct DefaultTrees
{
	BTCompiler Compiler;
	uint32_t Pilgrim = 0; // drawn to glyphs, frightened by wards
	uint32_t Warden = 0;  // braver; patrols gates and stands its ground

	DefaultTrees()
	{
		using N = BTNode;
		Pilgrim = Compiler.Compile(N::Selector({
			N::Sequence({ N::Greater(MCP_IN_FEAR, 0.55f), N::Do(MCP_ACTION_FLEE) }),
			N::Sequence({ N::Less(MCP_IN_ENERGY, 0.2f), N::Do(MCP_ACTION_REST) }),
			N::Sequence({ N::Greater(MCP_IN_DEVOTION, 0.6f), N::Greater(MCP_IN_ATTRACTION, 0.02f), N::Do(MCP_ACTION_COMMUNE) }),
			N::Sequence({ N::Greater(MCP_IN_ATTRACTION, 0.12f), N::Less(MCP_IN_CURIOSITY, 0.7f), N::Do(MCP_ACTION_SEEK_SIGIL) }),
			N::Sequence({ N::Greater(MCP_IN_CURIOSITY, 0.3f), N::Do(MCP_ACTION_WANDER) }),
			N::Do(MCP_ACTION_IDLE),
		}));
		Warden = Compiler.Compile(N::Selector({
			N::Sequence({ N::Greater(MCP_IN_FEAR, 0.85f), N::Do(MCP_ACTION_FLEE) }),
			N::Sequence({ N::Less(MCP_IN_ENERGY, 0.12f), N::Do(MCP_ACTION_REST) }),
			N::Sequence({ N::Greater(MCP_IN_ENTROPY, 0.5f), N::Do(MCP_ACTION_SEEK_SIGIL) }),
			N::Sequence({ N::Greater(MCP_IN_DEVOTION, 0.4f), N::Do(MCP_ACTION_COMMUNE) }),
			N::Do(MCP_ACTION_WANDER),
		}));
	}
};
} // namespace PrimordiaMCP
