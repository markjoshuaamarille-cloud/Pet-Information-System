import Modal from '@/Components/Modal';
import SecondaryButton from '@/Components/SecondaryButton';
import { useState } from 'react';

export default function ImageLightbox({
    src,
    alt = 'Photo',
    title,
    className = 'h-32 w-32 rounded-lg border border-gray-200 object-cover shadow-sm',
    hint = 'Click to enlarge',
}) {
    const [open, setOpen] = useState(false);

    if (!src) {
        return null;
    }

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="group relative shrink-0 overflow-hidden rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                title={hint}
            >
                <img
                    src={src}
                    alt={alt}
                    className={`${className} transition group-hover:brightness-95`}
                />
                <span className="pointer-events-none absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/50 to-transparent opacity-0 transition group-hover:opacity-100">
                    <span className="mb-1 rounded px-2 py-0.5 text-[10px] font-medium text-white">
                        {hint}
                    </span>
                </span>
            </button>

            <Modal show={open} onClose={() => setOpen(false)} maxWidth="4xl">
                <div className="p-4 sm:p-6">
                    <div className="mb-4 flex items-start justify-between gap-4">
                        <div>
                            {title && (
                                <h3 className="text-lg font-semibold text-gray-900">
                                    {title}
                                </h3>
                            )}
                            <p className="text-sm text-gray-500">{alt}</p>
                        </div>
                        <SecondaryButton
                            type="button"
                            onClick={() => setOpen(false)}
                        >
                            Close
                        </SecondaryButton>
                    </div>
                    <div className="flex max-h-[75vh] items-center justify-center overflow-auto rounded-lg border border-gray-200 bg-gray-50 p-2">
                        <img
                            src={src}
                            alt={alt}
                            className="max-h-[70vh] w-full object-contain"
                        />
                    </div>
                </div>
            </Modal>
        </>
    );
}
