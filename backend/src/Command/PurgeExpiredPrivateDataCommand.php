<?php

namespace App\Command;

use App\Entity\CandidateVerificationRequest;
use App\Service\CandidateCardStorage;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(
    name: 'app:purge-expired-private-data',
    description: 'Delete disability-card files whose post-review retention period has expired.',
)]
final class PurgeExpiredPrivateDataCommand extends Command
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly CandidateCardStorage $cardStorage,
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this->addOption('dry-run', null, InputOption::VALUE_NONE, 'Report expired files without deleting them.');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $now = new \DateTimeImmutable();
        $requests = $this->entityManager->createQueryBuilder()
            ->select('verification')
            ->from(CandidateVerificationRequest::class, 'verification')
            ->where('verification.documentRetentionUntil IS NOT NULL')
            ->andWhere('verification.documentRetentionUntil <= :now')
            ->andWhere('verification.documentStoredName IS NOT NULL')
            ->andWhere('verification.documentDeletedAt IS NULL')
            ->setParameter('now', $now)
            ->getQuery()
            ->getResult();

        if ($input->getOption('dry-run')) {
            $io->note(sprintf('%d disability-card file(s) would be purged.', count($requests)));
            return Command::SUCCESS;
        }

        foreach ($requests as $verification) {
            $this->cardStorage->delete((string) $verification->getDocumentStoredName());
            $verification->setDocumentStoredName(null)->setDocumentDeletedAt($now);
        }
        $this->entityManager->flush();

        $io->success(sprintf('Purged %d expired disability-card file(s).', count($requests)));
        return Command::SUCCESS;
    }
}
