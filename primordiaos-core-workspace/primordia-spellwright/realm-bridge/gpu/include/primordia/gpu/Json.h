// Minimal JSON value, parser and writer for the sidecar line protocol and PRS-1 manifests.
// Small on purpose: objects, arrays, numbers, strings, booleans and null, UTF-8 passthrough.
#pragma once

#include <cstdint>
#include <map>
#include <memory>
#include <string>
#include <string_view>
#include <variant>
#include <vector>

namespace primordia::gpu
{
class Json
{
public:
	using Array = std::vector<Json>;
	using Object = std::map<std::string, Json, std::less<>>;

	Json() = default;
	Json(std::nullptr_t) {}
	Json(bool B) : Value(B) {}
	Json(double D) : Value(D) {}
	Json(int I) : Value(static_cast<double>(I)) {}
	Json(int64_t I) : Value(static_cast<double>(I)) {}
	Json(uint32_t U) : Value(static_cast<double>(U)) {}
	Json(uint64_t U) : Value(static_cast<double>(U)) {}
	Json(const char* S) : Value(std::string(S)) {}
	Json(std::string S) : Value(std::move(S)) {}
	Json(Array A) : Value(std::make_shared<Array>(std::move(A))) {}
	Json(Object O) : Value(std::make_shared<Object>(std::move(O))) {}

	/** Parses Text. On failure returns null and sets Error (with the byte offset). */
	static Json Parse(std::string_view Text, std::string* Error = nullptr);

	bool IsNull() const { return std::holds_alternative<std::monostate>(Value); }
	bool IsBool() const { return std::holds_alternative<bool>(Value); }
	bool IsNumber() const { return std::holds_alternative<double>(Value); }
	bool IsString() const { return std::holds_alternative<std::string>(Value); }
	bool IsArray() const { return std::holds_alternative<std::shared_ptr<Array>>(Value); }
	bool IsObject() const { return std::holds_alternative<std::shared_ptr<Object>>(Value); }

	double Number(double Fallback = 0.0) const { return IsNumber() ? std::get<double>(Value) : Fallback; }
	bool Bool(bool Fallback = false) const { return IsBool() ? std::get<bool>(Value) : Fallback; }
	const std::string& String() const;
	const Array& Items() const;
	const Object& Members() const;

	/** Object member lookup; returns a shared null value when absent or not an object. */
	const Json& operator[](std::string_view Key) const;
	/** Array element lookup; returns null when out of range or not an array. */
	const Json& operator[](size_t Index) const;
	size_t Size() const;

	double Get(std::string_view Key, double Fallback) const { return (*this)[Key].Number(Fallback); }
	std::string GetString(std::string_view Key, std::string Fallback = {}) const;

	/** Mutable builders. */
	Json& Set(std::string Key, Json V);
	Json& Push(Json V);

	std::string Dump() const;

private:
	void DumpTo(std::string& Out) const;

	std::variant<std::monostate, bool, double, std::string, std::shared_ptr<Array>, std::shared_ptr<Object>> Value;
};
} // namespace primordia::gpu
