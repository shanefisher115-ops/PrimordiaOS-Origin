#include "primordia/gpu/Png.h"

#include <algorithm>
#include <array>
#include <cstdio>

namespace primordia::gpu
{
namespace
{
uint32_t Crc32(const uint8_t* Data, size_t Size, uint32_t Crc = 0xFFFFFFFFu)
{
	static const std::array<uint32_t, 256> Table = []
	{
		std::array<uint32_t, 256> T{};
		for (uint32_t N = 0; N < 256; ++N)
		{
			uint32_t C = N;
			for (int K = 0; K < 8; ++K)
			{
				C = (C & 1u) ? 0xEDB88320u ^ (C >> 1) : C >> 1;
			}
			T[N] = C;
		}
		return T;
	}();
	for (size_t I = 0; I < Size; ++I)
	{
		Crc = Table[(Crc ^ Data[I]) & 0xFFu] ^ (Crc >> 8);
	}
	return Crc;
}

void PutU32(std::vector<uint8_t>& Out, uint32_t V)
{
	Out.push_back(static_cast<uint8_t>(V >> 24));
	Out.push_back(static_cast<uint8_t>(V >> 16));
	Out.push_back(static_cast<uint8_t>(V >> 8));
	Out.push_back(static_cast<uint8_t>(V));
}

void PutChunk(std::vector<uint8_t>& Out, const char Type[4], const std::vector<uint8_t>& Data)
{
	PutU32(Out, static_cast<uint32_t>(Data.size()));
	const size_t TypeAt = Out.size();
	Out.insert(Out.end(), Type, Type + 4);
	Out.insert(Out.end(), Data.begin(), Data.end());
	PutU32(Out, Crc32(Out.data() + TypeAt, Data.size() + 4) ^ 0xFFFFFFFFu);
}
} // namespace

bool WritePngRgba(const std::string& Path, uint32_t Width, uint32_t Height, const std::vector<uint8_t>& Rgba)
{
	if (Rgba.size() < size_t(Width) * Height * 4)
	{
		return false;
	}
	// Raw scanlines, each prefixed with filter type 0.
	std::vector<uint8_t> Raw;
	Raw.reserve(size_t(Height) * (Width * 4 + 1));
	for (uint32_t Y = 0; Y < Height; ++Y)
	{
		Raw.push_back(0);
		const uint8_t* Row = Rgba.data() + size_t(Y) * Width * 4;
		Raw.insert(Raw.end(), Row, Row + size_t(Width) * 4);
	}

	// zlib stream of stored (uncompressed) deflate blocks, then Adler-32.
	std::vector<uint8_t> Z = { 0x78, 0x01 };
	uint32_t A = 1, B = 0;
	for (const uint8_t V : Raw)
	{
		A = (A + V) % 65521u;
		B = (B + A) % 65521u;
	}
	for (size_t Off = 0; Off < Raw.size() || Off == 0; Off += 65535)
	{
		const size_t Len = std::min<size_t>(65535, Raw.size() - Off);
		const bool bLast = Off + Len >= Raw.size();
		Z.push_back(bLast ? 1 : 0);
		Z.push_back(static_cast<uint8_t>(Len));
		Z.push_back(static_cast<uint8_t>(Len >> 8));
		Z.push_back(static_cast<uint8_t>(~Len));
		Z.push_back(static_cast<uint8_t>(~Len >> 8));
		Z.insert(Z.end(), Raw.begin() + Off, Raw.begin() + Off + Len);
		if (bLast)
		{
			break;
		}
	}
	PutU32(Z, (B << 16) | A);

	std::vector<uint8_t> Png = { 0x89, 'P', 'N', 'G', '\r', '\n', 0x1A, '\n' };
	std::vector<uint8_t> Header;
	PutU32(Header, Width);
	PutU32(Header, Height);
	Header.insert(Header.end(), { 8, 6, 0, 0, 0 }); // 8-bit RGBA, deflate, no filter, no interlace
	PutChunk(Png, "IHDR", Header);
	PutChunk(Png, "IDAT", Z);
	PutChunk(Png, "IEND", {});

	FILE* File = std::fopen(Path.c_str(), "wb");
	if (!File)
	{
		return false;
	}
	const bool bOk = std::fwrite(Png.data(), 1, Png.size(), File) == Png.size();
	std::fclose(File);
	return bOk;
}
} // namespace primordia::gpu
