// Windowed presentation (Win32): a window, its surface and a swapchain.
// Acquire semaphores are per frame slot; present semaphores are per swapchain image, because
// an image's present may still be pending when its slot comes round again.
#pragma once

#include "primordia/gpu/VulkanContext.h"

#include <cstdint>
#include <string>
#include <vector>

namespace primordia::gpu
{
class Win32Window
{
public:
	Win32Window(const std::string& Title, uint32_t Width, uint32_t Height);
	~Win32Window();
	Win32Window(const Win32Window&) = delete;
	Win32Window& operator=(const Win32Window&) = delete;

	/** Pumps pending messages. Returns false once the window was closed. */
	bool Pump();
	VkExtent2D ClientExtent() const;
	void* Hwnd() const { return Handle; }
	void* Instance() const { return Module; }
	void SetTitle(const std::string& Title);

private:
	void* Handle = nullptr;
	void* Module = nullptr;
	bool bOpen = true;
	friend struct WindowProcAccess;
};

class Swapchain
{
public:
	Swapchain(VulkanContext& Context, const Win32Window& Window, uint32_t FramesInFlight, bool bVsync);
	~Swapchain();
	Swapchain(const Swapchain&) = delete;
	Swapchain& operator=(const Swapchain&) = delete;

	struct Frame
	{
		uint32_t ImageIndex = 0;
		VkImage Image = VK_NULL_HANDLE;
		VkImageView View = VK_NULL_HANDLE;
		VkSemaphore Acquired = VK_NULL_HANDLE;
		VkSemaphore Rendered = VK_NULL_HANDLE;
	};
	/** Acquires the next image for frame slot Slot. Returns false when the swapchain must be
	 *  recreated (window resized or minimized). */
	bool Acquire(uint32_t Slot, Frame& Out);
	/** Presents on the graphics queue. Returns false when the swapchain must be recreated. */
	bool Present(const Frame& F);
	void Recreate();

	VkFormat Format() const { return SurfaceFormat.format; }
	VkExtent2D Extent() const { return Size; }

private:
	void Create();
	void Destroy();

	VulkanContext& Ctx;
	const Win32Window& Window;
	bool bVsync;
	VkSurfaceKHR Surface = VK_NULL_HANDLE;
	VkSwapchainKHR Handle = VK_NULL_HANDLE;
	VkSurfaceFormatKHR SurfaceFormat{};
	VkExtent2D Size{};
	std::vector<VkImage> Images;
	std::vector<VkImageView> Views;
	std::vector<VkSemaphore> AcquireSems;  // per frame slot
	std::vector<VkSemaphore> RenderedSems; // per swapchain image
};
} // namespace primordia::gpu
