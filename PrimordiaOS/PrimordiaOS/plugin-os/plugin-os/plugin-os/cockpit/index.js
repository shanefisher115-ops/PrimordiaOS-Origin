import { Kernel } from '@/os/kernel';
export const Cockpit = {
    init() {
        console.log('🛸 Cockpit Online');
        Kernel.boot();
    }
};
