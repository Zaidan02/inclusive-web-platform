<?php

namespace App\Service;

use Symfony\Component\HttpFoundation\File\UploadedFile;

final class CandidateCardStorage
{
    public const MAX_BYTES = 5 * 1024 * 1024;

    private const ALLOWED_MIME_TYPES = [
        'application/pdf' => 'pdf',
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
    ];

    public function __construct(
        private readonly string $candidateCardDirectory,
        private readonly SupabaseStorageClient $supabaseStorage,
        private readonly string $candidateCardBucket,
    ) {
    }

    /** @return array{storedName: string, originalName: string, mimeType: string, size: int} */
    public function store(UploadedFile $file): array
    {
        if (!$file->isValid()) {
            throw new \InvalidArgumentException('The disability card upload did not complete successfully.');
        }

        $size = (int) $file->getSize();
        if ($size < 1 || $size > self::MAX_BYTES) {
            throw new \InvalidArgumentException('The disability card must be no larger than 5 MB.');
        }

        $mimeType = (string) $file->getMimeType();
        $extension = self::ALLOWED_MIME_TYPES[$mimeType] ?? null;
        if ($extension === null) {
            throw new \InvalidArgumentException('Upload a PDF, JPEG, or PNG disability card.');
        }

        $storedName = bin2hex(random_bytes(24)) . '.' . $extension;
        if ($this->supabaseStorage->isConfigured()) {
            $this->supabaseStorage->upload(
                $this->candidateCardBucket,
                $storedName,
                $file->getPathname(),
                $mimeType
            );

            return [
                'storedName' => $storedName,
                'originalName' => mb_substr(basename($file->getClientOriginalName()), 0, 255),
                'mimeType' => $mimeType,
                'size' => $size,
            ];
        }

        if (!is_dir($this->candidateCardDirectory)
            && !mkdir($concurrentDirectory = $this->candidateCardDirectory, 0700, true)
            && !is_dir($concurrentDirectory)) {
            throw new \RuntimeException('The private document directory could not be created.');
        }
        $file->move($this->candidateCardDirectory, $storedName);
        @chmod($this->path($storedName), 0600);

        return [
            'storedName' => $storedName,
            'originalName' => mb_substr(basename($file->getClientOriginalName()), 0, 255),
            'mimeType' => $mimeType,
            'size' => $size,
        ];
    }

    public function path(string $storedName): string
    {
        $safeName = basename($storedName);
        if ($safeName !== $storedName) {
            throw new \RuntimeException('Invalid private document name.');
        }

        return $this->candidateCardDirectory . DIRECTORY_SEPARATOR . $safeName;
    }

    public function locate(string $storedName): ?string
    {
        if (!$this->supabaseStorage->isConfigured()) {
            $path = $this->path($storedName);
            return is_file($path) ? $path : null;
        }

        $temporaryPath = tempnam(sys_get_temp_dir(), 'join-card-');
        if ($temporaryPath === false) {
            throw new \RuntimeException('The private document could not be prepared for delivery.');
        }
        try {
            if (!$this->supabaseStorage->download($this->candidateCardBucket, $storedName, $temporaryPath)) {
                @unlink($temporaryPath);
                return null;
            }
        } catch (\Throwable $error) {
            @unlink($temporaryPath);
            throw $error;
        }
        return $temporaryPath;
    }

    public function usesTemporaryDownloads(): bool
    {
        return $this->supabaseStorage->isConfigured();
    }

    public function delete(string $storedName): void
    {
        if ($this->supabaseStorage->isConfigured()) {
            $this->supabaseStorage->delete($this->candidateCardBucket, $storedName);
            return;
        }
        $path = $this->path($storedName);
        if (is_file($path)) {
            @unlink($path);
        }
    }
}
