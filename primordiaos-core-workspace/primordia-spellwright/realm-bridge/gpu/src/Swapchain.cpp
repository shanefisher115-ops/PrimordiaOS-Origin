#include "primordia/gpu/Swapchain.h"

#ifdef _WIN32
#ifndef NOMINMAX
#define NOMINMAX
#endif
#ifndef WIN32_LEAN_AND_MEAN
#define WIN32_LEAN_AND_MEAN
#endif
#include <windows.h>
#include <vulkan/vulkan_win32.h>
#endif

#include <algorithm>

namespace primordia::gpu
{
#ifdef _WIN32
struct WindowProcAccess
{
	static LRESULT CALLBACK Proc(HWND Hwnd, UINT Msg, WPARAM W, LPARAM L)
	{
		auto* Self = reinterpret_cast<Win32Window*>(GetWindowLongPtrW(Hwnd, GWLP_USERDATA));
		if (Msg == WM_CLOSE && Self)
		{
			Self->bOpen = false;
			return 0;
		}
		return DefWindowProcW(Hwnd, Msg, W, L);
	}
};

Win32Window::Win32Window(const std::string& Title, uint32_t Width, uint32_t Height)
{
	Module = GetModuleHandleW(nullptr);
	WNDCLASSEXW Class{ sizeof(WNDCLASSEXW) };
	Class.style = CS_HREDRAW | CS_VREDRAW;
	Class.lpfnWndProc = &WindowProcAccess::Proc;
	Class.hInstance = static_cast<HINSTANCE>(Module);
	Class.hCursor = LoadCursorW(nullptr, MAKEINTRESOURCEW(32512)) /* IDC_ARROW */;
	Class.lpszClassName = L"PrimordiaRealmWindow";
	RegisterClassExW(&Class);
	RECT Rect{ 0, 0, static_cast<LONG>(Width), static_cast<LONG>(Height) };
	AdjustWindowRect(&Rect, WS_OVERLAPPEDWINDOW, FALSE);
	const std::wstring WideTitle(Title.begin(), Title.end());
	HWND Hwnd = CreateWindowExW(0, Class.lpszClassName, WideTitle.c_str(), WS_OVERLAPPEDWINDOW, CW_USEDEFAULT, CW_USEDEFAULT,
		Rect.right - Rect.left, Rect.bottom - Rect.top, nullptr, nullptr, static_cast<HINSTANCE>(Module), nullptr);
	if (!Hwnd)
	{
		throw VulkanError(VK_ERROR_INITIALIZATION_FAILED, "CreateWindowExW failed");
	}
	SetWindowLongPtrW(Hwnd, GWLP_USERDATA, reinterpret_cast<LONG_PTR>(this));
	ShowWindow(Hwnd, SW_SHOW);
	Handle = Hwnd;
}

Win32Window::~Win32Window()
{
	if (Handle)
	{
		DestroyWindow(static_cast<HWND>(Handle));
	}
}

bool Win32Window::Pump()
{
	MSG Msg;
	while (PeekMessageW(&Msg, nullptr, 0, 0, PM_REMOVE))
	{
		TranslateMessage(&Msg);
		DispatchMessageW(&Msg);
	}
	return bOpen;
}

VkExtent2D Win32Window::ClientExtent() const
{
	RECT Rect;
	GetClientRect(static_cast<HWND>(Handle), &Rect);
	return { static_cast<uint32_t>(std::max<LONG>(0, Rect.right - Rect.left)), static_cast<uint32_t>(std::max<LONG>(0, Rect.bottom - Rect.top)) };
}

void Win32Window::SetTitle(const std::string& Title)
{
	const std::wstring Wide(Title.begin(), Title.end());
	SetWindowTextW(static_cast<HWND>(Handle), Wide.c_str());
}

Swapchain::Swapchain(VulkanContext& Context, const Win32Window& InWindow, uint32_t FramesInFlight, bool bInVsync)
	: Ctx(Context), Window(InWindow), bVsync(bInVsync)
{
	VkWin32SurfaceCreateInfoKHR Info{ VK_STRUCTURE_TYPE_WIN32_SURFACE_CREATE_INFO_KHR };
	Info.hinstance = static_cast<HINSTANCE>(Window.Instance());
	Info.hwnd = static_cast<HWND>(Window.Hwnd());
	PGPU_CHECK(vkCreateWin32SurfaceKHR(Ctx.Instance(), &Info, nullptr, &Surface));
	VkBool32 bSupported = VK_FALSE;
	PGPU_CHECK(vkGetPhysicalDeviceSurfaceSupportKHR(Ctx.Physical(), Ctx.Queue(QueueRole::Graphics).Family, Surface, &bSupported));
	if (!bSupported)
	{
		throw VulkanError(VK_ERROR_FEATURE_NOT_PRESENT, "the graphics queue cannot present to this window");
	}
	for (uint32_t I = 0; I < FramesInFlight; ++I)
	{
		AcquireSems.push_back(Ctx.CreateBinarySemaphore("swapchain.acquire"));
	}
	Create();
}

Swapchain::~Swapchain()
{
	vkDeviceWaitIdle(Ctx.Device());
	Destroy();
	for (VkSemaphore S : AcquireSems)
	{
		vkDestroySemaphore(Ctx.Device(), S, nullptr);
	}
	vkDestroySurfaceKHR(Ctx.Instance(), Surface, nullptr);
}

void Swapchain::Create()
{
	VkSurfaceCapabilitiesKHR Caps;
	PGPU_CHECK(vkGetPhysicalDeviceSurfaceCapabilitiesKHR(Ctx.Physical(), Surface, &Caps));
	uint32_t Count = 0;
	vkGetPhysicalDeviceSurfaceFormatsKHR(Ctx.Physical(), Surface, &Count, nullptr);
	std::vector<VkSurfaceFormatKHR> Formats(Count);
	vkGetPhysicalDeviceSurfaceFormatsKHR(Ctx.Physical(), Surface, &Count, Formats.data());
	// The tonemap pass encodes sRGB itself, so it wants a UNORM target.
	SurfaceFormat = Formats.front();
	for (const VkSurfaceFormatKHR& F : Formats)
	{
		if (F.format == VK_FORMAT_B8G8R8A8_UNORM && F.colorSpace == VK_COLOR_SPACE_SRGB_NONLINEAR_KHR)
		{
			SurfaceFormat = F;
		}
	}
	vkGetPhysicalDeviceSurfacePresentModesKHR(Ctx.Physical(), Surface, &Count, nullptr);
	std::vector<VkPresentModeKHR> Modes(Count);
	vkGetPhysicalDeviceSurfacePresentModesKHR(Ctx.Physical(), Surface, &Count, Modes.data());
	VkPresentModeKHR Mode = VK_PRESENT_MODE_FIFO_KHR;
	if (!bVsync && std::find(Modes.begin(), Modes.end(), VK_PRESENT_MODE_MAILBOX_KHR) != Modes.end())
	{
		Mode = VK_PRESENT_MODE_MAILBOX_KHR;
	}

	Size = Caps.currentExtent.width != UINT32_MAX ? Caps.currentExtent : Window.ClientExtent();
	Size.width = std::clamp(Size.width, Caps.minImageExtent.width, Caps.maxImageExtent.width);
	Size.height = std::clamp(Size.height, Caps.minImageExtent.height, Caps.maxImageExtent.height);
	uint32_t ImageCount = Caps.minImageCount + 1;
	if (Caps.maxImageCount > 0)
	{
		ImageCount = std::min(ImageCount, Caps.maxImageCount);
	}

	VkSwapchainCreateInfoKHR Info{ VK_STRUCTURE_TYPE_SWAPCHAIN_CREATE_INFO_KHR };
	Info.surface = Surface;
	Info.minImageCount = ImageCount;
	Info.imageFormat = SurfaceFormat.format;
	Info.imageColorSpace = SurfaceFormat.colorSpace;
	Info.imageExtent = Size;
	Info.imageArrayLayers = 1;
	Info.imageUsage = VK_IMAGE_USAGE_COLOR_ATTACHMENT_BIT;
	Info.imageSharingMode = VK_SHARING_MODE_EXCLUSIVE; // rendered and presented on the graphics queue only
	Info.preTransform = Caps.currentTransform;
	Info.compositeAlpha = VK_COMPOSITE_ALPHA_OPAQUE_BIT_KHR;
	Info.presentMode = Mode;
	Info.clipped = VK_TRUE;
	Info.oldSwapchain = Handle;
	VkSwapchainKHR NewHandle;
	PGPU_CHECK(vkCreateSwapchainKHR(Ctx.Device(), &Info, nullptr, &NewHandle));
	if (Handle)
	{
		vkDestroySwapchainKHR(Ctx.Device(), Handle, nullptr);
	}
	Handle = NewHandle;

	vkGetSwapchainImagesKHR(Ctx.Device(), Handle, &Count, nullptr);
	Images.resize(Count);
	vkGetSwapchainImagesKHR(Ctx.Device(), Handle, &Count, Images.data());
	for (VkImage Image : Images)
	{
		VkImageViewCreateInfo ViewInfo{ VK_STRUCTURE_TYPE_IMAGE_VIEW_CREATE_INFO };
		ViewInfo.image = Image;
		ViewInfo.viewType = VK_IMAGE_VIEW_TYPE_2D;
		ViewInfo.format = SurfaceFormat.format;
		ViewInfo.subresourceRange = { VK_IMAGE_ASPECT_COLOR_BIT, 0, 1, 0, 1 };
		VkImageView View;
		PGPU_CHECK(vkCreateImageView(Ctx.Device(), &ViewInfo, nullptr, &View));
		Views.push_back(View);
		RenderedSems.push_back(Ctx.CreateBinarySemaphore("swapchain.rendered"));
	}
}

void Swapchain::Destroy()
{
	for (VkImageView V : Views)
	{
		vkDestroyImageView(Ctx.Device(), V, nullptr);
	}
	for (VkSemaphore S : RenderedSems)
	{
		vkDestroySemaphore(Ctx.Device(), S, nullptr);
	}
	Views.clear();
	RenderedSems.clear();
	Images.clear();
	if (Handle)
	{
		vkDestroySwapchainKHR(Ctx.Device(), Handle, nullptr);
		Handle = VK_NULL_HANDLE;
	}
}

void Swapchain::Recreate()
{
	vkDeviceWaitIdle(Ctx.Device());
	for (VkImageView V : Views)
	{
		vkDestroyImageView(Ctx.Device(), V, nullptr);
	}
	for (VkSemaphore S : RenderedSems)
	{
		vkDestroySemaphore(Ctx.Device(), S, nullptr);
	}
	Views.clear();
	RenderedSems.clear();
	Images.clear();
	Create(); // reuses Handle as oldSwapchain
}

bool Swapchain::Acquire(uint32_t Slot, Frame& Out)
{
	const VkExtent2D Client = Window.ClientExtent();
	if (Client.width == 0 || Client.height == 0)
	{
		return false; // minimized
	}
	const VkSemaphore Sem = AcquireSems[Slot % AcquireSems.size()];
	uint32_t Index = 0;
	const VkResult R = vkAcquireNextImageKHR(Ctx.Device(), Handle, UINT64_MAX, Sem, VK_NULL_HANDLE, &Index);
	if (R == VK_ERROR_OUT_OF_DATE_KHR)
	{
		return false;
	}
	if (R != VK_SUBOPTIMAL_KHR)
	{
		PGPU_CHECK(R);
	}
	Out.ImageIndex = Index;
	Out.Image = Images[Index];
	Out.View = Views[Index];
	Out.Acquired = Sem;
	Out.Rendered = RenderedSems[Index];
	return true;
}

bool Swapchain::Present(const Frame& F)
{
	VkPresentInfoKHR Info{ VK_STRUCTURE_TYPE_PRESENT_INFO_KHR };
	Info.waitSemaphoreCount = 1;
	Info.pWaitSemaphores = &F.Rendered;
	Info.swapchainCount = 1;
	Info.pSwapchains = &Handle;
	Info.pImageIndices = &F.ImageIndex;
	const VkResult R = vkQueuePresentKHR(Ctx.Queue(QueueRole::Graphics).Queue, &Info);
	if (R == VK_ERROR_OUT_OF_DATE_KHR || R == VK_SUBOPTIMAL_KHR)
	{
		return false;
	}
	PGPU_CHECK(R);
	return true;
}
#endif
} // namespace primordia::gpu
