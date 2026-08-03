<?php

namespace App\Controller;

use App\Entity\JobApplication;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Lexik\Bundle\JWTAuthenticationBundle\Encoder\JWTEncoderInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\ResponseHeaderBag;
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Mime\Email;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Routing\Attribute\Route;

final class AdminUserController extends AbstractController
{
    private function verifyAdmin(Request $request, JWTEncoderInterface $jwtEncoder): array|JsonResponse
    {
        $token = $request->headers->get('X-Auth-Token');

        if (!$token) {
            return $this->json(['message' => 'Missing authentication token.'], 401);
        }

        try {
            $decodedToken = $jwtEncoder->decode($token);
        } catch (\Throwable $e) {
            return $this->json([
                'message' => 'Invalid authentication token.',
                'error' => $e->getMessage()
            ], 401);
        }

        $roles = $decodedToken['roles'] ?? [];

        if (!in_array('ROLE_ADMIN', $roles, true)) {
            return $this->json(['message' => 'Access denied. Admin role required.'], 403);
        }

        return $decodedToken;
    }

    private function formatUser(User $user): array
    {
        return [
            'id' => $user->getId(),
            'username' => $user->getUsername(),
            'email' => $user->getEmail(),
            'roles' => $user->getRoles(),
            'isVerified' => $user->isVerified(),
            'isArchived' => $user->isArchived(),
        ];
    }

    private function formatApplication(JobApplication $application): array
    {
        $candidate = $application->getCandidate();
        $job = $application->getJobPost();

        return [
            'id' => $application->getId(),
            'candidateId' => $candidate?->getId(),
            'candidateName' => $candidate?->getUsername(),
            'candidateEmail' => $candidate?->getEmail(),
            'jobTitle' => $job?->getJobDefinition()?->getName(),
            'companyName' => $job?->getEmployer()?->getEmployerProfile()?->getCompanyName(),
            'status' => $application->getStatus(),
            'applicationOriginalName' => $application->getApplicationOriginalName(),
            'hasApplicationDocument' => $application->getApplicationFileName() !== null,
            'recommendationOriginalName' => $application->getRecommendationOriginalName(),
            'hasRecommendationLetter' => $application->getRecommendationFileName() !== null,
            'createdAt' => $application->getCreatedAt()?->format('Y-m-d H:i:s'),
            'updatedAt' => $application->getUpdatedAt()?->format('Y-m-d H:i:s'),
        ];
    }

    private function sendVerificationEmail(User $user, MailerInterface $mailer): void
    {
        $baseUrl = $_ENV['VERIFICATION_BASE_URL'] ?? 'http://127.0.0.1:8081';
        $verificationLink = $baseUrl . '/api/verify-email?token=' . $user->getVerificationToken();

        $email = (new Email())
            ->from($_ENV['MAILER_FROM'] ?? 'inclusive.web.platform@outlook.com')
            ->to($user->getEmail())
            ->subject('Verify your John Hospitality account')
            ->text(
                "Hello " . $user->getUsername() . ",\n\n" .
                "Your email address was updated by an administrator. " .
                "Please verify your new email by clicking the link below:\n\n" .
                $verificationLink . "\n\n" .
                "Thank you."
            )
            ->html(
                '<p>Hello <strong>' . htmlspecialchars($user->getUsername(), ENT_QUOTES, 'UTF-8') . '</strong>,</p>' .
                '<p>Your email address was updated by an administrator.</p>' .
                '<p>Please verify your new email by clicking the link below:</p>' .
                '<p><a href="' . htmlspecialchars($verificationLink, ENT_QUOTES, 'UTF-8') . '">Verify email</a></p>' .
                '<p>Thank you.</p>'
            );

        $mailer->send($email);
    }

    #[Route('/api/admin/users', name: 'api_admin_users_list', methods: ['GET'])]
    public function listUsers(
        Request $request,
        EntityManagerInterface $entityManager,
        JWTEncoderInterface $jwtEncoder
    ): JsonResponse {
        $adminCheck = $this->verifyAdmin($request, $jwtEncoder);

        if ($adminCheck instanceof JsonResponse) {
            return $adminCheck;
        }

        $users = $entityManager
            ->getRepository(User::class)
            ->findBy(['isArchived' => false], ['id' => 'ASC']);

        return $this->json([
            'users' => array_map(fn(User $user) => $this->formatUser($user), $users),
        ]);
    }

    #[Route('/api/admin/users/archived', name: 'api_admin_users_archived', methods: ['GET'])]
    public function listArchivedUsers(
        Request $request,
        EntityManagerInterface $entityManager,
        JWTEncoderInterface $jwtEncoder
    ): JsonResponse {
        $adminCheck = $this->verifyAdmin($request, $jwtEncoder);

        if ($adminCheck instanceof JsonResponse) {
            return $adminCheck;
        }

        $users = $entityManager
            ->getRepository(User::class)
            ->findBy(['isArchived' => true], ['id' => 'ASC']);

        return $this->json([
            'users' => array_map(fn(User $user) => $this->formatUser($user), $users),
        ]);
    }

    #[Route('/api/admin/candidate-profiles', name: 'api_admin_candidate_profiles', methods: ['GET'])]
    public function listCandidateProfiles(
        Request $request,
        EntityManagerInterface $entityManager,
        JWTEncoderInterface $jwtEncoder
    ): JsonResponse {
        $adminCheck = $this->verifyAdmin($request, $jwtEncoder);

        if ($adminCheck instanceof JsonResponse) {
            return $adminCheck;
        }

        $users = $entityManager
            ->getRepository(User::class)
            ->findBy(['isArchived' => false], ['id' => 'ASC']);

        $profilesData = [];

        foreach ($users as $user) {
            $roles = $user->getRoles();

            if (in_array('ROLE_ADMIN', $roles, true) || in_array('ROLE_EMPLOYER', $roles, true) || in_array('ROLE_VERIFIER', $roles, true)) {
                continue;
            }

            $profile = $user->getCandidateProfile();

            $applications = $entityManager
                ->getRepository(JobApplication::class)
                ->findBy(['candidate' => $user], ['id' => 'DESC']);

            $profilesData[] = [
                'id' => $user->getId(),
                'username' => $user->getUsername(),
                'email' => $user->getEmail(),
                'isVerified' => $user->isVerified(),
                'selectedDisabilities' => $profile ? $profile->getSelectedDisabilities() : [],
                'educationLevel' => $profile?->getEducationLevel(),
                'firstName' => $profile?->getFirstName(),
                'lastName' => $profile?->getLastName(),
                'phone' => $profile?->getPhone(),
                'location' => $profile?->getLocation(),
                'about' => $profile?->getAbout(),
                'updatedAt' => $profile && $profile->getUpdatedAt()
                    ? $profile->getUpdatedAt()->format('Y-m-d H:i:s')
                    : null,
                'applications' => array_map(
                    fn(JobApplication $application) => $this->formatApplication($application),
                    $applications
                ),
            ];
        }

        return $this->json([
            'profiles' => $profilesData,
        ]);
    }

    #[Route('/api/admin/applications', name: 'api_admin_applications', methods: ['GET'])]
    public function listAllApplications(
        Request $request,
        EntityManagerInterface $entityManager,
        JWTEncoderInterface $jwtEncoder
    ): JsonResponse {
        $adminCheck = $this->verifyAdmin($request, $jwtEncoder);

        if ($adminCheck instanceof JsonResponse) {
            return $adminCheck;
        }

        $applications = $entityManager
            ->getRepository(JobApplication::class)
            ->findBy([], ['id' => 'DESC']);

        return $this->json([
            'applications' => array_map(
                fn(JobApplication $application) => $this->formatApplication($application),
                $applications
            ),
        ]);
    }

    #[Route('/api/admin/applications/{id}/download/{type}', name: 'api_admin_application_download', methods: ['GET'])]
    public function downloadApplicationFile(
        int $id,
        string $type,
        Request $request,
        EntityManagerInterface $entityManager,
        JWTEncoderInterface $jwtEncoder
    ): BinaryFileResponse|JsonResponse {
        $adminCheck = $this->verifyAdmin($request, $jwtEncoder);

        if ($adminCheck instanceof JsonResponse) {
            return $adminCheck;
        }

        $application = $entityManager->getRepository(JobApplication::class)->find($id);

        if (!$application) {
            return $this->json(['message' => 'Application not found.'], 404);
        }

        if ($type === 'application') {
            $storedName = $application->getApplicationFileName();
            $originalName = $application->getApplicationOriginalName() ?: 'application-document';
        } elseif ($type === 'recommendation') {
            $storedName = $application->getRecommendationFileName();
            $originalName = $application->getRecommendationOriginalName() ?: 'recommendation-letter';
        } else {
            return $this->json(['message' => 'Invalid file type.'], 400);
        }

        if (!$storedName) {
            return $this->json(['message' => 'File not provided.'], 404);
        }

        $filePath = $this->getParameter('kernel.project_dir') . '/public/uploads/applications/' . $storedName;

        if (!file_exists($filePath)) {
            return $this->json(['message' => 'File not found on server.'], 404);
        }

        $response = new BinaryFileResponse($filePath);

        $disposition = $request->query->get('download') === '1'
            ? ResponseHeaderBag::DISPOSITION_ATTACHMENT
            : ResponseHeaderBag::DISPOSITION_INLINE;

        $response->setContentDisposition($disposition, $originalName);

        return $response;
    }

    #[Route('/api/admin/users/{id<\d+>}', name: 'api_admin_users_update', methods: ['PATCH'])]
    public function updateUser(
        int $id,
        Request $request,
        EntityManagerInterface $entityManager,
        JWTEncoderInterface $jwtEncoder,
        UserPasswordHasherInterface $passwordHasher,
        MailerInterface $mailer
    ): JsonResponse {
        $adminCheck = $this->verifyAdmin($request, $jwtEncoder);

        if ($adminCheck instanceof JsonResponse) {
            return $adminCheck;
        }

        $user = $entityManager
            ->getRepository(User::class)
            ->find($id);

        if (!$user) {
            return $this->json(['message' => 'User not found.'], 404);
        }

        $data = json_decode($request->getContent(), true);

        if (!is_array($data)) {
            return $this->json(['message' => 'Invalid request body.'], 400);
        }

        $username = trim($data['username'] ?? '');
        $email = trim($data['email'] ?? '');
        $password = trim($data['password'] ?? '');

        if ($username === '' || $email === '') {
            return $this->json(['message' => 'Username and email are required.'], 400);
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return $this->json(['message' => 'Invalid email format.'], 400);
        }

        $existingUsernameUser = $entityManager
            ->getRepository(User::class)
            ->findOneBy(['username' => $username]);

        if ($existingUsernameUser && $existingUsernameUser->getId() !== $user->getId()) {
            return $this->json(['message' => 'This username is already used.'], 409);
        }

        $existingEmailUser = $entityManager
            ->getRepository(User::class)
            ->findOneBy(['email' => $email]);

        if ($existingEmailUser && $existingEmailUser->getId() !== $user->getId()) {
            return $this->json(['message' => 'This email is already used.'], 409);
        }

        $emailChanged = strtolower($email) !== strtolower((string) $user->getEmail());

        $user->setUsername($username);

        if ($emailChanged) {
            $verificationToken = bin2hex(random_bytes(32));

            $user->setEmail($email);
            $user->setIsVerified(false);
            $user->setVerificationToken($verificationToken);
        }

        if ($password !== '') {
            if (strlen($password) < 8) {
                return $this->json(['message' => 'Password must be at least 8 characters long.'], 400);
            }

            $hashedPassword = $passwordHasher->hashPassword($user, $password);
            $user->setPassword($hashedPassword);
        }

        $entityManager->flush();

        $emailSendFailed = false;
        $emailSendError = null;

        if ($emailChanged) {
            try {
                $this->sendVerificationEmail($user, $mailer);
            } catch (\Throwable $e) {
                $emailSendFailed = true;
                $emailSendError = $e->getMessage();
            }
        }

        return $this->json([
            'message' => $emailChanged
                ? (
                    $emailSendFailed
                        ? 'User updated, but the verification email could not be sent.'
                        : 'User updated successfully. A new verification email was sent.'
                )
                : 'User updated successfully.',
            'user' => $this->formatUser($user),
            'emailVerificationRequired' => $emailChanged,
            'emailSendFailed' => $emailSendFailed,
            'emailSendError' => $emailSendError,
        ], $emailSendFailed ? 207 : 200);
    }

    #[Route('/api/admin/users/{id<\d+>}/archive', name: 'api_admin_users_archive', methods: ['PATCH'])]
    public function archiveUser(
        int $id,
        Request $request,
        EntityManagerInterface $entityManager,
        JWTEncoderInterface $jwtEncoder
    ): JsonResponse {
        $adminCheck = $this->verifyAdmin($request, $jwtEncoder);

        if ($adminCheck instanceof JsonResponse) {
            return $adminCheck;
        }

        $user = $entityManager
            ->getRepository(User::class)
            ->find($id);

        if (!$user) {
            return $this->json(['message' => 'User not found.'], 404);
        }

        $currentAdminEmail = $adminCheck['username'] ?? null;

        if ($currentAdminEmail === $user->getEmail()) {
            return $this->json(['message' => 'You cannot archive your own admin account.'], 400);
        }

        $user->setIsArchived(true);
        $entityManager->flush();

        return $this->json([
            'message' => 'User archived successfully.',
            'user' => $this->formatUser($user),
        ], 200);
    }

    #[Route('/api/admin/users/{id<\d+>}/restore', name: 'api_admin_users_restore', methods: ['PATCH'])]
    public function restoreUser(
        int $id,
        Request $request,
        EntityManagerInterface $entityManager,
        JWTEncoderInterface $jwtEncoder
    ): JsonResponse {
        $adminCheck = $this->verifyAdmin($request, $jwtEncoder);

        if ($adminCheck instanceof JsonResponse) {
            return $adminCheck;
        }

        $user = $entityManager
            ->getRepository(User::class)
            ->find($id);

        if (!$user) {
            return $this->json(['message' => 'User not found.'], 404);
        }

        $user->setIsArchived(false);
        $entityManager->flush();

        return $this->json([
            'message' => 'User restored successfully.',
            'user' => $this->formatUser($user),
        ], 200);
    }

    #[Route('/api/admin/users/{id<\d+>}', name: 'api_admin_users_delete', methods: ['DELETE'])]
    public function deleteUser(
        int $id,
        Request $request,
        EntityManagerInterface $entityManager,
        JWTEncoderInterface $jwtEncoder
    ): JsonResponse {
        $adminCheck = $this->verifyAdmin($request, $jwtEncoder);

        if ($adminCheck instanceof JsonResponse) {
            return $adminCheck;
        }

        $user = $entityManager
            ->getRepository(User::class)
            ->find($id);

        if (!$user) {
            return $this->json(['message' => 'User not found.'], 404);
        }

        $currentAdminEmail = $adminCheck['username'] ?? null;

        if ($currentAdminEmail === $user->getEmail()) {
            return $this->json(['message' => 'You cannot delete your own admin account.'], 400);
        }

        $entityManager->remove($user);
        $entityManager->flush();

        return $this->json(['message' => 'User deleted successfully.'], 200);
    }
}
