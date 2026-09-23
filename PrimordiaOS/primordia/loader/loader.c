#include <efi.h>
#include <efilib.h>

EFI_STATUS
EFIAPI
efi_main (EFI_HANDLE ImageHandle, EFI_SYSTEM_TABLE *SystemTable) {
    InitializeLib(ImageHandle, SystemTable);

    Print(L"PrimordiaOS EFI Loader\n");

    EFI_STATUS Status;
    EFI_FILE_IO_INTERFACE *FileSystem;
    EFI_FILE_HANDLE Root, PrimordiaDir, NodeExe, EntryScript;

    // Locate the first filesystem (your P: partition)
    Status = LibLocateProtocol(&FileSystemProtocol, (VOID**)&FileSystem);
    if (EFI_ERROR(Status)) {
        Print(L"Cannot locate filesystem.\n");
        return Status;
    }

    Status = FileSystem->OpenVolume(FileSystem, &Root);
    if (EFI_ERROR(Status)) {
        Print(L"Cannot open filesystem volume.\n");
        return Status;
    }

    // Open PrimordiaOS directory
    Status = Root->Open(Root, &PrimordiaDir, L"primordia", EFI_FILE_MODE_READ, 0);
    if (EFI_ERROR(Status)) {
        Print(L"Cannot open PrimordiaOS directory.\n");
        return Status;
    }

    // Load Node.exe (or Bun.exe)
    Status = PrimordiaDir->Open(PrimordiaDir, &NodeExe, L"node.exe", EFI_FILE_MODE_READ, 0);
    if (EFI_ERROR(Status)) {
        Print(L"Cannot find node.exe.\n");
        return Status;
    }

    // Load your TS entrypoint
    Status = PrimordiaDir->Open(PrimordiaDir, &EntryScript, L"src\\main.js", EFI_FILE_MODE_READ, 0);
    if (EFI_ERROR(Status)) {
        Print(L"Cannot find main.js.\n");
        return Status;
    }

    Print(L"Launching PrimordiaOS runtime...\n");

    // This is where you'd implement PE loader logic or chainload into a tiny OS
    // For now, just print success.
    Print(L"PrimordiaOS runtime would start here.\n");

    return EFI_SUCCESS;
}
