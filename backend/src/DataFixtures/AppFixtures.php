<?php

namespace App\DataFixtures;

use App\Entity\CandidateProfile;
use App\Entity\Disability;
use App\Entity\DisabilityTaskAssessment;
use App\Entity\EmployerProfile;
use App\Entity\JobDefinition;
use App\Entity\JobDefinitionTask;
use App\Entity\JobPost;
use App\Entity\JobPostHighlightedTask;
use App\Entity\User;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Persistence\ObjectManager;

final class AppFixtures extends Fixture
{
    private const DEFAULT_PASSWORD = 'Pass123!@#';

    public function load(ObjectManager $manager): void
    {
        $demoPassword = trim((string) ($_ENV['DEMO_ACCOUNT_PASSWORD'] ?? self::DEFAULT_PASSWORD));
        if (strlen($demoPassword) < 12) {
            throw new \RuntimeException('DEMO_ACCOUNT_PASSWORD must contain at least 12 characters.');
        }
        $candidateUser = null;
        $employerUsers = [];
        $accounts = [
            ['username' => 'admin', 'email' => 'admin@join.local', 'roles' => ['ROLE_ADMIN']],
            ['username' => 'verifier', 'email' => 'verifier@join.local', 'roles' => ['ROLE_VERIFIER']],
            ['username' => 'employer', 'email' => 'employer@join.local', 'roles' => ['ROLE_EMPLOYER'], 'company' => ['name' => 'JoIn Hospitality Demo', 'industry' => 'Food and Beverage', 'location' => 'Beirut, Lebanon', 'website' => 'https://example.com', 'logo' => '/join-hospitality-logo.png.jpeg']],
            ['username' => 'cedar_sweets', 'email' => 'cedar.sweets@join.local', 'roles' => ['ROLE_EMPLOYER'], 'company' => ['name' => 'Cedar Sweets', 'industry' => 'Confectionery', 'location' => 'Jounieh, Lebanon', 'website' => 'https://example.com/cedar-sweets', 'logo' => null]],
            ['username' => 'north_scoop', 'email' => 'north.scoop@join.local', 'roles' => ['ROLE_EMPLOYER'], 'company' => ['name' => 'North Scoop', 'industry' => 'Ice Cream Production', 'location' => 'Tripoli, Lebanon', 'website' => 'https://example.com/north-scoop', 'logo' => null]],
            ['username' => 'artisan_bakery', 'email' => 'artisan.bakery@join.local', 'roles' => ['ROLE_EMPLOYER'], 'company' => ['name' => 'Beirut Artisan Bakery', 'industry' => 'Bakery and Pastry', 'location' => 'Beirut, Lebanon', 'website' => 'https://example.com/artisan-bakery', 'logo' => null]],
            ['username' => 'candidate', 'email' => 'candidate@join.local', 'roles' => ['ROLE_CANDIDATE']],
        ];

        foreach ($accounts as $account) {
            $user = (new User())
                ->setUsername($account['username'])
                ->setEmail($account['email'])
                ->setRoles($account['roles'])
                ->setIsVerified(true)
                ->setIsArchived(false)
                ->setVerificationToken(null);

            $user->setPassword(password_hash($demoPassword, PASSWORD_BCRYPT));

            $manager->persist($user);

            if ($account['username'] === 'candidate') {
                $candidateUser = $user;
            }

            if (in_array('ROLE_EMPLOYER', $account['roles'], true)) {
                $company = $account['company'];
                $profile = (new EmployerProfile())
                    ->setUser($user)
                    ->setCompanyName($company['name'])
                    ->setIndustry($company['industry'])
                    ->setLocation($company['location'])
                    ->setWebsite($company['website'])
                    ->setLogoUrl($company['logo'])
                    ->setDescription($company['name'] . ' is a fixture company used to demonstrate inclusive job matching.')
                    ->setAccessibilityStatement('Task assistance and reasonable workplace accommodation are available when stated on the job offer.')
                    ->setUpdatedAt(new \DateTimeImmutable());
                $user->setEmployerProfile($profile);
                $manager->persist($profile);
                $employerUsers[] = $user;
            }
        }

        $cataloguePath = dirname(__DIR__, 2) . '/data/job_catalogue.json';
        $catalogue = json_decode((string) file_get_contents($cataloguePath), true, flags: JSON_THROW_ON_ERROR);
        $disabilities = [];

        foreach ($catalogue['disabilities'] as $record) {
            $disability = (new Disability())
                ->setSlug($record['slug'])
                ->setName($record['name'])
                ->setActive(true);
            $disabilities[$record['slug']] = $disability;
            $manager->persist($disability);
        }

        if (!$candidateUser instanceof User || !isset($disabilities['ankle'])) {
            throw new \RuntimeException('The candidate fixture requires the candidate account and Ankle disability.');
        }

        $candidateProfile = (new CandidateProfile())
            ->setUser($candidateUser)
            ->replaceDisabilities([$disabilities['ankle']])
            ->setEducationLevel('high_school')
            ->setReadingAbility('independent')
            ->setWritingAbility('independent')
            ->setNumeracyAbility('with_support')
            ->setFirstName('Alex')
            ->setLastName('Candidate')
            ->setPhone('+961 70 123 456')
            ->setLocation('Beirut, Lebanon')
            ->setAbout('Reliable and motivated candidate interested in practical, inclusive employment opportunities.')
            ->setUpdatedAt(new \DateTimeImmutable());
        $candidateUser->setCandidateProfile($candidateProfile);
        $manager->persist($candidateProfile);

        if (count($employerUsers) < 1) {
            throw new \RuntimeException('The job fixtures require at least one employer account.');
        }

        $jobIndex = 0;
        $practicalRequirementsByJob = [
            'chocolate-confectionery-worker' => ['required', 'preferred', 'required', 'required'],
            'ice-cream-maker' => ['preferred', 'not_required', 'required', 'preferred'],
            'bakery-pastry-worker' => ['preferred', 'not_required', 'preferred', 'required'],
        ];

        foreach ($catalogue['jobs'] as $jobRecord) {
            $job = (new JobDefinition())
                ->setSlug($jobRecord['slug'])
                ->setName($jobRecord['name'])
                ->setDescription(sprintf('Catalogue definition imported from %s.', $jobRecord['sourceWorkbook']))
                ->setMinimumEducationLevel('none')
                ->setActive(true);
            $manager->persist($job);

            $tasks = [];
            foreach ($jobRecord['tasks'] as $taskRecord) {
                $task = (new JobDefinitionTask())
                    ->setJobDefinition($job)
                    ->setTaskKey($taskRecord['key'])
                    ->setName($taskRecord['name'])
                    ->setPosition($taskRecord['position'])
                    ->setWeight(1.0)
                    ->setMandatory(false);
                $tasks[$taskRecord['key']] = $task;
                $manager->persist($task);
            }

            foreach ($jobRecord['assessments'] as $assessmentRecord) {
                if (!isset($tasks[$assessmentRecord['taskKey']], $disabilities[$assessmentRecord['disability']])) {
                    throw new \RuntimeException('Catalogue assessment references an unknown task or disability.');
                }

                $assessment = (new DisabilityTaskAssessment())
                    ->setTask($tasks[$assessmentRecord['taskKey']])
                    ->setDisability($disabilities[$assessmentRecord['disability']])
                    ->setFeasibility($assessmentRecord['feasibility'])
                    ->setSourceSheet($assessmentRecord['sourceSheet'])
                    ->setSourceRow($assessmentRecord['sourceRow']);
                $manager->persist($assessment);
            }

            foreach ([10, 20, 30, 50] as $importantTaskCount) {
                foreach ([false, true] as $assistanceAvailable) {
                    $employer = $employerUsers[($jobIndex * 8 + $importantTaskCount + (int) $assistanceAvailable) % count($employerUsers)];
                    $companyProfile = $employer->getEmployerProfile();
                    $selectedTasks = array_slice(array_values($tasks), 0, min($importantTaskCount, count($tasks)));
                    $actualImportantTaskCount = count($selectedTasks);
                    [$readingRequirement, $writingRequirement, $numeracyRequirement, $positionKnowledgeRequirement]
                        = $practicalRequirementsByJob[$jobRecord['slug']] ?? ['not_required', 'not_required', 'not_required', 'not_required'];
                    $post = (new JobPost())
                        ->setEmployer($employer)
                        ->setJobDefinition($job)
                        ->setLocation((string) $companyProfile?->getLocation())
                        ->setJobType($assistanceAvailable ? 'Full-time' : 'Part-time')
                        ->setWorkMode('On-site')
                        ->setDescription('A practical ' . $jobRecord['name'] . ' opportunity at ' . $companyProfile?->getCompanyName() . '. This seeded offer marks ' . $actualImportantTaskCount . ' catalogue tasks as important and demonstrates scoring with assistance ' . ($assistanceAvailable ? 'available.' : 'not available.'))
                        ->setApplicationDeadline(new \DateTimeImmutable('+6 months'))
                        ->setCvRequired(false)
                        ->setCoverLetterRequired(false)
                        ->setAssistanceAvailable($assistanceAvailable)
                        ->setEducationRequirement('not_required')
                        ->setMinimumEducationLevel(null)
                        ->setReadingRequirement($readingRequirement)
                        ->setWritingRequirement($writingRequirement)
                        ->setNumeracyRequirement($numeracyRequirement)
                        ->setPositionKnowledgeRequirement($positionKnowledgeRequirement)
                        ->setStatus('published');
                    foreach ($selectedTasks as $position => $task) {
                        $post->addHighlightedTask((new JobPostHighlightedTask())->setTask($task)->setDisplayPosition($position + 1));
                    }
                    $manager->persist($post);
                }
            }
            $jobIndex++;
        }

        $manager->flush();
    }
}
