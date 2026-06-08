export function clinicScopeSubtitle(activeClinic, isPlatformAdmin = false) {
    if (isPlatformAdmin && !activeClinic?.name) {
        return 'Combined data from all registered clinics';
    }

    if (!activeClinic?.name) {
        return null;
    }

    return `Showing data for ${activeClinic.name} only`;
}

export function clinicScopeTitle(title, activeClinic, isPlatformAdmin = false) {
    if (isPlatformAdmin && !activeClinic?.name) {
        return `${title} — All Clinics`;
    }

    if (!activeClinic?.name) {
        return title;
    }

    return `${title} — ${activeClinic.name}`;
}

export function adminRequiresClinicSelection(activeClinic, isPlatformAdmin) {
    return Boolean(isPlatformAdmin && !activeClinic?.id);
}
