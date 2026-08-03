<?php

namespace App\Command;

use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputArgument;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

#[AsCommand(
    name: 'app:create-verifier',
    description: 'Create an email-verified authorized candidate-verifier account.',
)]
final class CreateVerifierCommand extends Command
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly UserPasswordHasherInterface $passwordHasher,
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this
            ->addArgument('email', InputArgument::REQUIRED, 'Verifier email address')
            ->addArgument('username', InputArgument::REQUIRED, 'Unique verifier username')
            ->addOption(
                'password',
                null,
                InputOption::VALUE_REQUIRED,
                'Password for non-interactive local automation; omit it to enter the password securely'
            );
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $email = strtolower(trim((string) $input->getArgument('email')));
        $username = trim((string) $input->getArgument('username'));

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $io->error('Enter a valid email address.');
            return Command::INVALID;
        }
        if (mb_strlen($username) < 2 || mb_strlen($username) > 50) {
            $io->error('The username must contain between 2 and 50 characters.');
            return Command::INVALID;
        }

        $users = $this->entityManager->getRepository(User::class);
        if ($users->findOneBy(['email' => $email]) instanceof User) {
            $io->error('That email address is already registered.');
            return Command::FAILURE;
        }
        if ($users->findOneBy(['username' => $username]) instanceof User) {
            $io->error('That username is already registered.');
            return Command::FAILURE;
        }

        $password = $input->getOption('password');
        if (!is_string($password) || $password === '') {
            $password = (string) $io->askHidden('Verifier password');
        }
        if (strlen($password) < 8
            || !preg_match('/[a-z]/', $password)
            || !preg_match('/[A-Z]/', $password)
            || !preg_match('/[\W_]/', $password)) {
            $io->error('The password must have at least 8 characters, lowercase, uppercase, and a symbol.');
            return Command::INVALID;
        }

        $user = (new User())
            ->setEmail($email)
            ->setUsername($username)
            ->setRoles(['ROLE_VERIFIER'])
            ->setIsVerified(true)
            ->setIsArchived(false)
            ->setVerificationToken(null);
        $user->setPassword($this->passwordHasher->hashPassword($user, $password));

        $this->entityManager->persist($user);
        $this->entityManager->flush();

        $io->success(sprintf('Authorized verifier %s was created.', $email));
        return Command::SUCCESS;
    }
}
