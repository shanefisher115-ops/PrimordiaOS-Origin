#include "primordia/gpu/Json.h"

#include <cctype>
#include <charconv>
#include <cmath>
#include <cstdio>

namespace primordia::gpu
{
namespace
{
const Json& NullJson()
{
	static const Json Null;
	return Null;
}

class Parser
{
public:
	explicit Parser(std::string_view InText) : Text(InText) {}

	Json Run(std::string* Error)
	{
		SkipSpace();
		Json V = ParseValue();
		SkipSpace();
		if (Failed.empty() && Pos != Text.size())
		{
			Fail("trailing characters");
		}
		if (!Failed.empty())
		{
			if (Error)
			{
				*Error = Failed + " at byte " + std::to_string(Pos);
			}
			return Json();
		}
		return V;
	}

private:
	void Fail(const char* Why)
	{
		if (Failed.empty())
		{
			Failed = Why;
		}
	}

	void SkipSpace()
	{
		while (Pos < Text.size() && (Text[Pos] == ' ' || Text[Pos] == '\t' || Text[Pos] == '\n' || Text[Pos] == '\r'))
		{
			++Pos;
		}
	}

	bool Consume(std::string_view Word)
	{
		if (Text.substr(Pos, Word.size()) == Word)
		{
			Pos += Word.size();
			return true;
		}
		return false;
	}

	Json ParseValue()
	{
		if (++Depth > 256)
		{
			Fail("nesting too deep");
			return Json();
		}
		Json Result;
		if (Pos >= Text.size())
		{
			Fail("unexpected end");
		}
		else if (Text[Pos] == '{')
		{
			Result = ParseObject();
		}
		else if (Text[Pos] == '[')
		{
			Result = ParseArray();
		}
		else if (Text[Pos] == '"')
		{
			Result = Json(ParseString());
		}
		else if (Consume("true"))
		{
			Result = Json(true);
		}
		else if (Consume("false"))
		{
			Result = Json(false);
		}
		else if (Consume("null"))
		{
			Result = Json();
		}
		else
		{
			Result = ParseNumber();
		}
		--Depth;
		return Result;
	}

	Json ParseNumber()
	{
		const size_t Start = Pos;
		while (Pos < Text.size() && (std::isdigit(static_cast<unsigned char>(Text[Pos])) || Text[Pos] == '-' || Text[Pos] == '+' || Text[Pos] == '.' || Text[Pos] == 'e' || Text[Pos] == 'E'))
		{
			++Pos;
		}
		double V = 0.0;
		const auto [Ptr, Ec] = std::from_chars(Text.data() + Start, Text.data() + Pos, V);
		if (Ec != std::errc() || Ptr != Text.data() + Pos || Start == Pos)
		{
			Fail("bad number");
		}
		return Json(V);
	}

	static void AppendUtf8(std::string& Out, uint32_t Cp)
	{
		if (Cp < 0x80)
		{
			Out += static_cast<char>(Cp);
		}
		else if (Cp < 0x800)
		{
			Out += static_cast<char>(0xC0 | (Cp >> 6));
			Out += static_cast<char>(0x80 | (Cp & 0x3F));
		}
		else if (Cp < 0x10000)
		{
			Out += static_cast<char>(0xE0 | (Cp >> 12));
			Out += static_cast<char>(0x80 | ((Cp >> 6) & 0x3F));
			Out += static_cast<char>(0x80 | (Cp & 0x3F));
		}
		else
		{
			Out += static_cast<char>(0xF0 | (Cp >> 18));
			Out += static_cast<char>(0x80 | ((Cp >> 12) & 0x3F));
			Out += static_cast<char>(0x80 | ((Cp >> 6) & 0x3F));
			Out += static_cast<char>(0x80 | (Cp & 0x3F));
		}
	}

	uint32_t ParseHex4()
	{
		if (Pos + 4 > Text.size())
		{
			Fail("bad \\u escape");
			return 0;
		}
		uint32_t V = 0;
		const auto [Ptr, Ec] = std::from_chars(Text.data() + Pos, Text.data() + Pos + 4, V, 16);
		if (Ec != std::errc() || Ptr != Text.data() + Pos + 4)
		{
			Fail("bad \\u escape");
		}
		Pos += 4;
		return V;
	}

	std::string ParseString()
	{
		std::string Out;
		++Pos; // opening quote
		while (Pos < Text.size() && Text[Pos] != '"')
		{
			char C = Text[Pos++];
			if (C != '\\')
			{
				Out += C;
				continue;
			}
			if (Pos >= Text.size())
			{
				break;
			}
			C = Text[Pos++];
			switch (C)
			{
			case '"': Out += '"'; break;
			case '\\': Out += '\\'; break;
			case '/': Out += '/'; break;
			case 'b': Out += '\b'; break;
			case 'f': Out += '\f'; break;
			case 'n': Out += '\n'; break;
			case 'r': Out += '\r'; break;
			case 't': Out += '\t'; break;
			case 'u':
			{
				uint32_t Cp = ParseHex4();
				if (Cp >= 0xD800 && Cp < 0xDC00 && Consume("\\u"))
				{
					const uint32_t Low = ParseHex4();
					Cp = 0x10000 + ((Cp - 0xD800) << 10) + (Low - 0xDC00);
				}
				AppendUtf8(Out, Cp);
				break;
			}
			default: Fail("bad escape"); break;
			}
		}
		if (Pos >= Text.size())
		{
			Fail("unterminated string");
			return Out;
		}
		++Pos; // closing quote
		return Out;
	}

	Json ParseArray()
	{
		Json::Array Items;
		++Pos;
		SkipSpace();
		if (Pos < Text.size() && Text[Pos] == ']')
		{
			++Pos;
			return Json(std::move(Items));
		}
		while (Failed.empty())
		{
			SkipSpace();
			Items.push_back(ParseValue());
			SkipSpace();
			if (Pos < Text.size() && Text[Pos] == ',')
			{
				++Pos;
				continue;
			}
			if (Pos < Text.size() && Text[Pos] == ']')
			{
				++Pos;
				break;
			}
			Fail("expected , or ]");
		}
		return Json(std::move(Items));
	}

	Json ParseObject()
	{
		Json::Object Members;
		++Pos;
		SkipSpace();
		if (Pos < Text.size() && Text[Pos] == '}')
		{
			++Pos;
			return Json(std::move(Members));
		}
		while (Failed.empty())
		{
			SkipSpace();
			if (Pos >= Text.size() || Text[Pos] != '"')
			{
				Fail("expected a key");
				break;
			}
			std::string Key = ParseString();
			SkipSpace();
			if (Pos >= Text.size() || Text[Pos] != ':')
			{
				Fail("expected :");
				break;
			}
			++Pos;
			SkipSpace();
			Members[std::move(Key)] = ParseValue();
			SkipSpace();
			if (Pos < Text.size() && Text[Pos] == ',')
			{
				++Pos;
				continue;
			}
			if (Pos < Text.size() && Text[Pos] == '}')
			{
				++Pos;
				break;
			}
			Fail("expected , or }");
		}
		return Json(std::move(Members));
	}

	std::string_view Text;
	size_t Pos = 0;
	int Depth = 0;
	std::string Failed;
};

void EscapeTo(std::string& Out, const std::string& S)
{
	Out += '"';
	for (const char C : S)
	{
		switch (C)
		{
		case '"': Out += "\\\""; break;
		case '\\': Out += "\\\\"; break;
		case '\n': Out += "\\n"; break;
		case '\r': Out += "\\r"; break;
		case '\t': Out += "\\t"; break;
		default:
			if (static_cast<unsigned char>(C) < 0x20)
			{
				char Buf[8];
				std::snprintf(Buf, sizeof(Buf), "\\u%04x", C);
				Out += Buf;
			}
			else
			{
				Out += C;
			}
		}
	}
	Out += '"';
}
} // namespace

Json Json::Parse(std::string_view Text, std::string* Error)
{
	return Parser(Text).Run(Error);
}

const std::string& Json::String() const
{
	static const std::string Empty;
	return IsString() ? std::get<std::string>(Value) : Empty;
}

const Json::Array& Json::Items() const
{
	static const Array Empty;
	return IsArray() ? *std::get<std::shared_ptr<Array>>(Value) : Empty;
}

const Json::Object& Json::Members() const
{
	static const Object Empty;
	return IsObject() ? *std::get<std::shared_ptr<Object>>(Value) : Empty;
}

const Json& Json::operator[](std::string_view Key) const
{
	if (!IsObject())
	{
		return NullJson();
	}
	const Object& O = Members();
	const auto It = O.find(Key);
	return It == O.end() ? NullJson() : It->second;
}

const Json& Json::operator[](size_t Index) const
{
	const Array& A = Items();
	return Index < A.size() ? A[Index] : NullJson();
}

size_t Json::Size() const
{
	return IsArray() ? Items().size() : IsObject() ? Members().size() : 0;
}

std::string Json::GetString(std::string_view Key, std::string Fallback) const
{
	const Json& V = (*this)[Key];
	return V.IsString() ? V.String() : Fallback;
}

Json& Json::Set(std::string Key, Json V)
{
	if (!IsObject())
	{
		Value = std::make_shared<Object>();
	}
	(*std::get<std::shared_ptr<Object>>(Value))[std::move(Key)] = std::move(V);
	return *this;
}

Json& Json::Push(Json V)
{
	if (!IsArray())
	{
		Value = std::make_shared<Array>();
	}
	std::get<std::shared_ptr<Array>>(Value)->push_back(std::move(V));
	return *this;
}

std::string Json::Dump() const
{
	std::string Out;
	DumpTo(Out);
	return Out;
}

void Json::DumpTo(std::string& Out) const
{
	if (IsNull())
	{
		Out += "null";
	}
	else if (IsBool())
	{
		Out += std::get<bool>(Value) ? "true" : "false";
	}
	else if (IsNumber())
	{
		const double D = std::get<double>(Value);
		if (!std::isfinite(D))
		{
			Out += "null";
			return;
		}
		char Buf[32];
		const auto [Ptr, Ec] = std::to_chars(Buf, Buf + sizeof(Buf), D);
		Out.append(Buf, Ec == std::errc() ? Ptr : Buf);
	}
	else if (IsString())
	{
		EscapeTo(Out, std::get<std::string>(Value));
	}
	else if (IsArray())
	{
		Out += '[';
		bool bFirst = true;
		for (const Json& V : Items())
		{
			if (!bFirst)
			{
				Out += ',';
			}
			bFirst = false;
			V.DumpTo(Out);
		}
		Out += ']';
	}
	else
	{
		Out += '{';
		bool bFirst = true;
		for (const auto& [K, V] : Members())
		{
			if (!bFirst)
			{
				Out += ',';
			}
			bFirst = false;
			EscapeTo(Out, K);
			Out += ':';
			V.DumpTo(Out);
		}
		Out += '}';
	}
}
} // namespace primordia::gpu
