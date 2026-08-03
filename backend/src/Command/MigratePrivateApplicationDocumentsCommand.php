<?php

namespace App\Command;

use App\Entity\JobApplication;
use App\Service\ApplicationDocumentStorage;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(
    name: 'app:migrate-private-application-documents',
    description: 'Move legacy application documents out of the public web directory.',
)]
final class MigratePrivateApplicationDocumentsCommand extends Command
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly ApplicationDocumentStorage $storage,
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this->addOption('dry-run', null, InputOption::VALUE_NONE, 'Report legacy documents without moving them.');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $moved = 0;
        foreach ($this->entityManager->getRepository(JobApplication::class)->findAll() as $application) {
            foreach ([$application->getApplicationFileName(), $application->getRecommendationFileName()] as $storedName) {
                if ($storedName !== null && $this->storage->legacyExists($storedName)) {
                    ++$moved;
                    if (!$input->getOption('dry-run')) {
                        $this->storage->migrateLegacy($storedName);
                    }
                }
            }
        }
        if ($input->getOption('dry-run')) {
            $io->note(sprintf('%d legacy application document(s) would be moved.', $moved));
            return Command::SUCCESS;
        }
        $io->success(sprintf('Moved %d application document(s) into private storage.', $moved));
        return Command::SUCCESS;
    }
}
