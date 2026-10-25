# PrimordiaOS GPU realm engine: Onyx + Vulkan + MCP (standalone).
# Needs the Vulkan SDK (1.3+; provides Vulkan headers/loader, VMA, DXC, spirv-val).
#
#   cmake -S . -B build -G Ninja -DCMAKE_BUILD_TYPE=Release
#   cmake --build build
#   build/bin/primordia_gpu_tests
#   build/bin/primordia_realmd --frames 600 --png realm.png
cmake_minimum_required(VERSION 3.24)
project(PrimordiaGPU LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/bin)

find_package(Vulkan 1.3 REQUIRED)
get_filename_component(VULKAN_SDK_ROOT "${Vulkan_INCLUDE_DIRS}/.." ABSOLUTE)
find_program(PRIMORDIA_DXC dxc HINTS "${VULKAN_SDK_ROOT}/Bin" "$ENV{VULKAN_SDK}/Bin" REQUIRED NO_DEFAULT_PATH)
find_program(PRIMORDIA_SPIRV_VAL spirv-val HINTS "${VULKAN_SDK_ROOT}/Bin" "$ENV{VULKAN_SDK}/Bin" REQUIRED NO_DEFAULT_PATH)

# The GPU data contract and kernel bodies live in the Unreal plugin, shared with this engine.
set(PRIMORDIA_SHARED_DIR "${CMAKE_CURRENT_SOURCE_DIR}/../unreal/PrimordiaGPU/Shaders/Shared")
set(SHADER_OUT "${CMAKE_RUNTIME_OUTPUT_DIRECTORY}/shaders")
file(MAKE_DIRECTORY "${SHADER_OUT}")
file(GLOB SHARED_SHADER_SOURCES "${PRIMORDIA_SHARED_DIR}/*.ush")
set(SHADER_DEPS ${SHARED_SHADER_SOURCES} "${CMAKE_CURRENT_SOURCE_DIR}/shaders/Bindings.hlsli" "${CMAKE_CURRENT_SOURCE_DIR}/shaders/render/RealmCommon.hlsli")
set(DXC_FLAGS -spirv -fspv-target-env=vulkan1.3 -fvk-use-dx-layout -Zpc -O3 -HV 2021 -WX
	-I "${CMAKE_CURRENT_SOURCE_DIR}/shaders" -I "${PRIMORDIA_SHARED_DIR}")

set(SPIRV_OUTPUTS)
function(primordia_shader SOURCE PROFILE ENTRY OUTPUT)
	add_custom_command(
		OUTPUT "${SHADER_OUT}/${OUTPUT}"
		COMMAND "${PRIMORDIA_DXC}" ${DXC_FLAGS} -T ${PROFILE} -E ${ENTRY} -Fo "${SHADER_OUT}/${OUTPUT}" "${SOURCE}"
		COMMAND "${PRIMORDIA_SPIRV_VAL}" --target-env vulkan1.3 "${SHADER_OUT}/${OUTPUT}"
		DEPENDS "${SOURCE}" ${SHADER_DEPS}
		COMMENT "dxc ${OUTPUT}"
		VERBATIM)
	set(SPIRV_OUTPUTS ${SPIRV_OUTPUTS} "${SHADER_OUT}/${OUTPUT}" PARENT_SCOPE)
endfunction()

foreach(KERNEL tick_reset topology structures sigil_field cognition memory_compress memory_retrieve)
	primordia_shader("${CMAKE_CURRENT_SOURCE_DIR}/shaders/mcp/${KERNEL}.comp.hlsl" cs_6_6 main "${KERNEL}.comp.spv")
endforeach()
foreach(PASS terrain spire actor sigil memory tonemap)
	primordia_shader("${CMAKE_CURRENT_SOURCE_DIR}/shaders/render/${PASS}.hlsl" vs_6_6 MainVS "${PASS}.vs.spv")
	primordia_shader("${CMAKE_CURRENT_SOURCE_DIR}/shaders/render/${PASS}.hlsl" ps_6_6 MainPS "${PASS}.ps.spv")
endforeach()
add_custom_target(primordia_shaders ALL DEPENDS ${SPIRV_OUTPUTS})

add_library(primordia_gpu STATIC
	src/Json.cpp
	src/MCP.cpp
	src/Onyx.cpp
	src/Png.cpp
	src/RealmLoop.cpp
	src/RealmRenderer.cpp
	src/RealmState.cpp
	src/Swapchain.cpp
	src/VmaImplementation.cpp
	src/VulkanContext.cpp)
target_include_directories(primordia_gpu PUBLIC include "${PRIMORDIA_SHARED_DIR}" "${Vulkan_INCLUDE_DIRS}")
target_link_libraries(primordia_gpu PUBLIC Vulkan::Vulkan)
add_dependencies(primordia_gpu primordia_shaders)
if(MSVC)
	target_compile_options(primordia_gpu PRIVATE /W4 /permissive- /EHsc /utf-8)
	target_compile_definitions(primordia_gpu PUBLIC NOMINMAX WIN32_LEAN_AND_MEAN _CRT_SECURE_NO_WARNINGS)
	set_source_files_properties(src/VmaImplementation.cpp PROPERTIES COMPILE_OPTIONS "/W0")
else()
	target_compile_options(primordia_gpu PRIVATE -Wall -Wextra)
	set_source_files_properties(src/VmaImplementation.cpp PROPERTIES COMPILE_OPTIONS "-w")
endif()

add_executable(primordia_realmd tools/primordia_realmd.cpp)
target_link_libraries(primordia_realmd PRIVATE primordia_gpu)
add_executable(primordia_gpu_tests tests/mcp_tests.cpp)
target_link_libraries(primordia_gpu_tests PRIVATE primordia_gpu)
if(MSVC)
	target_compile_options(primordia_realmd PRIVATE /W4 /permissive- /EHsc /utf-8)
	target_compile_options(primordia_gpu_tests PRIVATE /W4 /permissive- /EHsc /utf-8)
endif()
