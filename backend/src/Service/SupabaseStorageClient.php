<?php

namespace App\Service;

use Symfony\Contracts\HttpClient\HttpClientInterface;

final class SupabaseStorageClient
{
    public function __construct(
        private readonly HttpClientInterface $httpClient,
        private readonly string $supabaseUrl,
        private readonly string $supabaseSecretKey,
    ) {
    }

    public function isConfigured(): bool
    {
        return $this->supabaseUrl !== '' && $this->supabaseSecretKey !== '';
    }

    public function upload(string $bucket, string $objectName, string $localPath, string $mimeType): void
    {
        $this->assertConfigured();
        $stream = @fopen($localPath, 'rb');
        if ($stream === false) {
            throw new \RuntimeException('The validated upload could not be read.');
        }

        try {
            $response = $this->httpClient->request('POST', $this->objectUrl($bucket, $objectName), [
                'headers' => [
                    'apikey' => $this->supabaseSecretKey,
                    'Content-Type' => $mimeType,
                    'x-upsert' => 'false',
                ],
                'body' => $stream,
                'timeout' => 60,
            ]);
            $status = $response->getStatusCode();
            $response->getContent(false);
        } finally {
            fclose($stream);
        }

        if ($status < 200 || $status >= 300) {
            throw new \RuntimeException('The remote file store rejected the upload.');
        }
    }

    public function download(string $bucket, string $objectName, string $targetPath): bool
    {
        $this->assertConfigured();
        $response = $this->httpClient->request(
            'GET',
            $this->authenticatedObjectUrl($bucket, $objectName),
            [
                'headers' => ['apikey' => $this->supabaseSecretKey],
                'timeout' => 60,
            ]
        );
        $status = $response->getStatusCode();
        if ($status === 404) {
            $response->getContent(false);
            return false;
        }
        $content = $response->getContent(false);
        if ($status < 200 || $status >= 300) {
            throw new \RuntimeException('The remote file store rejected the download.');
        }
        if (@file_put_contents($targetPath, $content, LOCK_EX) === false) {
            throw new \RuntimeException('The private document could not be prepared for delivery.');
        }
        @chmod($targetPath, 0600);
        return true;
    }

    public function delete(string $bucket, string $objectName): void
    {
        $this->assertConfigured();
        $response = $this->httpClient->request('DELETE', $this->bucketUrl($bucket), [
            'headers' => [
                'apikey' => $this->supabaseSecretKey,
                'Content-Type' => 'application/json',
            ],
            'json' => ['prefixes' => [$this->safeObjectName($objectName)]],
            'timeout' => 30,
        ]);
        $status = $response->getStatusCode();
        $response->getContent(false);
        if ($status < 200 || $status >= 300) {
            throw new \RuntimeException('The remote file store rejected the deletion.');
        }
    }

    public function publicUrl(string $bucket, string $objectName): string
    {
        $this->assertConfigured();
        return $this->baseUrl() . '/storage/v1/object/public/'
            . rawurlencode($this->safeBucket($bucket)) . '/'
            . $this->encodedObjectName($objectName);
    }

    private function objectUrl(string $bucket, string $objectName): string
    {
        return $this->bucketUrl($bucket) . '/' . $this->encodedObjectName($objectName);
    }

    private function authenticatedObjectUrl(string $bucket, string $objectName): string
    {
        return $this->baseUrl() . '/storage/v1/object/authenticated/'
            . rawurlencode($this->safeBucket($bucket)) . '/'
            . $this->encodedObjectName($objectName);
    }

    private function bucketUrl(string $bucket): string
    {
        return $this->baseUrl() . '/storage/v1/object/' . rawurlencode($this->safeBucket($bucket));
    }

    private function baseUrl(): string
    {
        return rtrim($this->supabaseUrl, '/');
    }

    private function encodedObjectName(string $objectName): string
    {
        return implode('/', array_map('rawurlencode', explode('/', $this->safeObjectName($objectName))));
    }

    private function safeBucket(string $bucket): string
    {
        if ($bucket === '' || !preg_match('/^[a-z0-9][a-z0-9_-]*$/', $bucket)) {
            throw new \InvalidArgumentException('Invalid storage bucket.');
        }
        return $bucket;
    }

    private function safeObjectName(string $objectName): string
    {
        if ($objectName === '' || str_contains($objectName, '..') || str_starts_with($objectName, '/')) {
            throw new \InvalidArgumentException('Invalid storage object name.');
        }
        return $objectName;
    }

    private function assertConfigured(): void
    {
        if (!$this->isConfigured()) {
            throw new \LogicException('Supabase Storage is not configured.');
        }
    }
}
