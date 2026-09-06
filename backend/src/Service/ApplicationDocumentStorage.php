<?php

namespace App\Service;

use Symfony\Component\HttpFoundation\File\UploadedFile;

final class ApplicationDocumentStorage
{
    public const MAX_BYTES = 10 * 1024 * 1024;

    private const TYPES = [
        'application/pdf' => 'pdf',
        'application/msword' => 'doc',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' => 'docx',
    ];

    public function __construct(
        private readonly string $applicationDocumentDirectory,
        private readonly string $legacyApplicationDocumentDirectory,
        private readonly SupabaseStorageClient $supabaseStorage,
        private readonly string $applicationDocumentBucket,
    ) {
    }

    /** @return array{storedName: string, originalName: string} */
    public function store(UploadedFile $file): array
    {
        if (!$file->isValid()) {
            throw new \InvalidArgumentException('The document upload did not complete successfully.');
        }
        $size = (int) $file->getSize();
        if ($size < 1 || $size > self::MAX_BYTES) {
            throw new \InvalidArgumentException('Application documents must be no larger than 10 MB.');
        }
        $mime = strtolower((string) $file->getMimeType());
        $extension = self::TYPES[$mime] ?? null;
        $clientExtension = strtolower($file->getClientOriginalExtension());
        if ($extension === null
            && in_array($mime, ['application/zip', 'application/x-zip-compressed'], true)
            && $clientExtension === 'docx') {
            // Some libmagic versions identify the validated OOXML container as ZIP.
            $extension = 'docx';
        }
        if ($extension === null
            && in_array($mime, ['application/cdfv2', 'application/vnd.ms-office', 'application/x-ole-storage'], true)
            && $clientExtension === 'doc') {
            // Legacy Word files use the Compound File Binary container.
            $extension = 'doc';
        }
        if ($extension === null) {
            throw new \InvalidArgumentException('Only validated PDF, DOC, and DOCX documents are allowed.');
        }
        $storedName = bin2hex(random_bytes(24)) . '.' . $extension;
        if ($this->supabaseStorage->isConfigured()) {
            $storageMimeType = match ($extension) {
                'pdf' => 'application/pdf',
                'doc' => 'application/msword',
                'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            };
            $this->supabaseStorage->upload(
                $this->applicationDocumentBucket,
                $storedName,
                $file->getPathname(),
                $storageMimeType
            );
            return [
                'storedName' => $storedName,
                'originalName' => mb_substr(basename($file->getClientOriginalName()), 0, 255),
            ];
        }
        if (!is_dir($this->applicationDocumentDirectory)
            && !mkdir($directory = $this->applicationDocumentDirectory, 0700, true)
            && !is_dir($directory)) {
            throw new \RuntimeException('The private application-document directory could not be created.');
        }
        $file->move($this->applicationDocumentDirectory, $storedName);
        @chmod($this->path($storedName), 0600);
        return [
            'storedName' => $storedName,
            'originalName' => mb_substr(basename($file->getClientOriginalName()), 0, 255),
        ];
    }

    public function path(string $storedName): string
    {
        if (basename($storedName) !== $storedName) {
            throw new \RuntimeException('Invalid private document name.');
        }
        return $this->applicationDocumentDirectory . DIRECTORY_SEPARATOR . $storedName;
    }

    public function locate(string $storedName): ?string
    {
        if ($this->supabaseStorage->isConfigured()) {
            $temporaryPath = tempnam(sys_get_temp_dir(), 'join-application-');
            if ($temporaryPath === false) {
                throw new \RuntimeException('The private document could not be prepared for delivery.');
            }
            try {
                if (!$this->supabaseStorage->download($this->applicationDocumentBucket, $storedName, $temporaryPath)) {
                    @unlink($temporaryPath);
                    return null;
                }
            } catch (\Throwable $error) {
                @unlink($temporaryPath);
                throw $error;
            }
            return $temporaryPath;
        }
        $private = $this->path($storedName);
        if (is_file($private)) return $private;
        $legacy = $this->legacyApplicationDocumentDirectory . DIRECTORY_SEPARATOR . basename($storedName);
        return is_file($legacy) ? $legacy : null;
    }

    public function delete(string $storedName): void
    {
        if ($this->supabaseStorage->isConfigured()) {
            $this->supabaseStorage->delete($this->applicationDocumentBucket, $storedName);
        }
        foreach ([$this->path($storedName), $this->legacyApplicationDocumentDirectory . DIRECTORY_SEPARATOR . basename($storedName)] as $path) {
            if (is_file($path)) @unlink($path);
        }
    }

    public function migrateLegacy(string $storedName): bool
    {
        $legacy = $this->legacyApplicationDocumentDirectory . DIRECTORY_SEPARATOR . basename($storedName);
        if (!is_file($legacy)) return false;
        if ($this->supabaseStorage->isConfigured()) {
            $mimeType = match (strtolower(pathinfo($storedName, PATHINFO_EXTENSION))) {
                'pdf' => 'application/pdf',
                'doc' => 'application/msword',
                'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                default => 'application/octet-stream',
            };
            $this->supabaseStorage->upload($this->applicationDocumentBucket, $storedName, $legacy, $mimeType);
            if (!@unlink($legacy)) {
                throw new \RuntimeException('Could not remove the migrated legacy document.');
            }
            return true;
        }
        if (!is_dir($this->applicationDocumentDirectory)) mkdir($this->applicationDocumentDirectory, 0700, true);
        $target = $this->path($storedName);
        if (!rename($legacy, $target)) throw new \RuntimeException('Could not move a legacy document to private storage.');
        @chmod($target, 0600);
        return true;
    }

    public function legacyExists(string $storedName): bool
    {
        return is_file($this->legacyApplicationDocumentDirectory . DIRECTORY_SEPARATOR . basename($storedName));
    }

    public function usesTemporaryDownloads(): bool
    {
        return $this->supabaseStorage->isConfigured();
    }
}
