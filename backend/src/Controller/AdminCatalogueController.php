<?php

namespace App\Controller;

use App\Service\JobCatalogueImporter;
use Lexik\Bundle\JWTAuthenticationBundle\Encoder\JWTEncoderInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Process\Exception\ProcessFailedException;
use Symfony\Component\Routing\Attribute\Route;

final class AdminCatalogueController extends AbstractController
{
    #[Route('/api/admin/job-catalogue/import', name: 'api_admin_job_catalogue_import', methods: ['POST'])]
    public function import(
        Request $request,
        JWTEncoderInterface $jwtEncoder,
        JobCatalogueImporter $importer
    ): JsonResponse {
        $authError = $this->verifyAdmin($request, $jwtEncoder);
        if ($authError) {
            return $authError;
        }

        $files = $request->files->all('workbooks');
        if ($files instanceof UploadedFile) {
            $files = [$files];
        }
        $files = array_values(array_filter((array) $files, fn ($file) => $file instanceof UploadedFile));

        try {
            $summary = $importer->import($files);
            return $this->json([
                'message' => sprintf(
                    'Imported %d job definition(s), %d task(s), and %d assessment(s).',
                    $summary['jobsImported'],
                    $summary['tasksImported'],
                    $summary['assessmentsImported']
                ),
                'summary' => $summary,
            ], 201);
        } catch (\InvalidArgumentException|\DomainException $error) {
            return $this->json(['message' => $error->getMessage()], 422);
        } catch (ProcessFailedException $error) {
            return $this->json([
                'message' => 'The workbook could not be parsed.',
                'details' => trim($error->getProcess()->getErrorOutput()),
            ], 422);
        } catch (\JsonException|\RuntimeException $error) {
            return $this->json(['message' => $error->getMessage()], 422);
        }
    }

    private function verifyAdmin(Request $request, JWTEncoderInterface $jwtEncoder): ?JsonResponse
    {
        $token = $request->headers->get('X-Auth-Token');
        if (!$token) {
            return $this->json(['message' => 'Missing authentication token.'], 401);
        }

        try {
            $decoded = $jwtEncoder->decode($token);
        } catch (\Throwable) {
            return $this->json(['message' => 'Invalid authentication token.'], 401);
        }

        $roles = $decoded['roles'] ?? [];
        if (!in_array('ROLE_ADMIN', $roles, true) && !in_array('ROLE_SUPER_ADMIN', $roles, true)) {
            return $this->json(['message' => 'Access denied. Admin role required.'], 403);
        }

        return null;
    }
}
