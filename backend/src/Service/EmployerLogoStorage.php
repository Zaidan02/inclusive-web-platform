<?php

namespace App\Service;

use Symfony\Component\HttpFoundation\File\UploadedFile;

final class EmployerLogoStorage
{
    private const MAX_BYTES = 3 * 1024 * 1024;
    private const TYPES = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
    ];

    public function __construct(
        private readonly SupabaseStorageClient $supabaseStorage,
        private readonly string $employerLogoBucket,
        private readonly string $employerLogoDirectory,
    ) {
    }

    public function store(UploadedFile $file): string
    {
        if (!$file->isValid()) {
            throw new \InvalidArgumentException('The logo upload did not complete successfully.');
        }
        $mimeType = strtolower((string) $file->getMimeType());
        $extension = self::TYPES[$mimeType] ?? null;
        if ($extension === null) {
            throw new \InvalidArgumentException('Logo must be a JPEG or PNG image.');
        }
        $size = (int) $file->getSize();
        if ($size < 1 || $size > self::MAX_BYTES) {
            throw new \InvalidArgumentException('Logo image must be no larger than 3 MB.');
        }

        $storedName = bin2hex(random_bytes(24)) . '.' . $extension;
        if ($this->supabaseStorage->isConfigured()) {
            $this->supabaseStorage->upload(
                $this->employerLogoBucket,
                $storedName,
                $file->getPathname(),
                $mimeType
            );
            return $this->supabaseStorage->publicUrl($this->employerLogoBucket, $storedName);
        }

        if (!is_dir($this->employerLogoDirectory)
            && !mkdir($directory = $this->employerLogoDirectory, 0775, true)
            && !is_dir($directory)) {
            throw new \RuntimeException('The logo directory could not be created.');
        }
        $file->move($this->employerLogoDirectory, $storedName);
        return '/uploads/employer-logos/' . $storedName;
    }
}
