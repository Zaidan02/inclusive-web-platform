<?php

namespace App\Entity;

use App\Repository\JobPostRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: JobPostRepository::class)]
class JobPost
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: false)]
    private ?User $employer = null;

    #[ORM\ManyToOne(targetEntity: JobDefinition::class)]
    #[ORM\JoinColumn(nullable: false)]
    private ?JobDefinition $jobDefinition = null;

    #[ORM\Column(length: 255)]
    private ?string $location = null;

    #[ORM\Column(length: 50)]
    private ?string $jobType = null;

    #[ORM\Column(length: 20, options: ['default' => 'work'])]
    private string $opportunityType = 'work';

    #[ORM\Column(length: 50)]
    private ?string $workMode = null;

    #[ORM\Column(type: 'text')]
    private ?string $description = null;

    #[ORM\Column]
    private ?\DateTimeImmutable $applicationDeadline = null;

    #[ORM\Column(options: ['default' => false])]
    private bool $cvRequired = false;

    #[ORM\Column(options: ['default' => false])]
    private bool $coverLetterRequired = false;

    #[ORM\Column(options: ['default' => false])]
    private bool $assistanceAvailable = false;

    #[ORM\Column(length: 20, options: ['default' => 'not_required'])]
    private string $educationRequirement = 'not_required';

    #[ORM\Column(length: 50, nullable: true)]
    private ?string $minimumEducationLevel = null;

    #[ORM\Column(length: 20, options: ['default' => 'not_required'])]
    private string $readingRequirement = 'not_required';

    #[ORM\Column(length: 20, options: ['default' => 'not_required'])]
    private string $writingRequirement = 'not_required';

    #[ORM\Column(length: 20, options: ['default' => 'not_required'])]
    private string $numeracyRequirement = 'not_required';

    #[ORM\Column(length: 20, options: ['default' => 'not_required'])]
    private string $positionKnowledgeRequirement = 'not_required';

    #[ORM\Column(length: 50)]
    private ?string $status = 'published';

    #[ORM\Column]
    private ?\DateTimeImmutable $createdAt = null;

    #[ORM\Column]
    private ?\DateTimeImmutable $updatedAt = null;

    /** @var Collection<int, JobPostHighlightedTask> */
    #[ORM\OneToMany(mappedBy: 'jobPost', targetEntity: JobPostHighlightedTask::class, cascade: ['persist', 'remove'], orphanRemoval: true)]
    #[ORM\OrderBy(['displayPosition' => 'ASC'])]
    private Collection $highlightedTasks;

    public function __construct()
    {
        $this->createdAt = new \DateTimeImmutable();
        $this->updatedAt = new \DateTimeImmutable();
        $this->status = 'published';
        $this->highlightedTasks = new ArrayCollection();
    }

    public function getId(): ?int { return $this->id; }

    public function getEmployer(): ?User { return $this->employer; }

    public function setEmployer(?User $employer): static
    {
        $this->employer = $employer;
        return $this;
    }

    public function getJobDefinition(): ?JobDefinition { return $this->jobDefinition; }

    public function setJobDefinition(?JobDefinition $jobDefinition): static
    {
        $this->jobDefinition = $jobDefinition;
        return $this;
    }

    public function getLocation(): ?string { return $this->location; }

    public function setLocation(string $location): static
    {
        $this->location = $location;
        return $this;
    }

    public function getJobType(): ?string { return $this->jobType; }

    public function setJobType(string $jobType): static
    {
        $this->jobType = $jobType;
        return $this;
    }

    public function getOpportunityType(): string { return $this->opportunityType; }

    public function setOpportunityType(string $opportunityType): static
    {
        $this->opportunityType = $opportunityType;
        return $this;
    }

    public function getWorkMode(): ?string { return $this->workMode; }

    public function setWorkMode(string $workMode): static
    {
        $this->workMode = $workMode;
        return $this;
    }

    public function getDescription(): ?string { return $this->description; }

    public function setDescription(string $description): static
    {
        $this->description = $description;
        return $this;
    }

    public function getApplicationDeadline(): ?\DateTimeImmutable
    {
        return $this->applicationDeadline;
    }

    public function setApplicationDeadline(\DateTimeImmutable $applicationDeadline): static
    {
        $this->applicationDeadline = $applicationDeadline;
        return $this;
    }

    public function isCvRequired(): bool { return $this->cvRequired; }

    public function setCvRequired(bool $cvRequired): static
    {
        $this->cvRequired = $cvRequired;
        return $this;
    }

    public function isCoverLetterRequired(): bool { return $this->coverLetterRequired; }

    public function setCoverLetterRequired(bool $coverLetterRequired): static
    {
        $this->coverLetterRequired = $coverLetterRequired;
        return $this;
    }

    public function getStatus(): ?string { return $this->status; }

    public function setStatus(string $status): static
    {
        $this->status = $status;
        return $this;
    }

    public function getCreatedAt(): ?\DateTimeImmutable { return $this->createdAt; }

    public function getUpdatedAt(): ?\DateTimeImmutable { return $this->updatedAt; }

    public function setUpdatedAt(\DateTimeImmutable $updatedAt): static
    {
        $this->updatedAt = $updatedAt;
        return $this;
    }

    /** @return Collection<int, JobPostHighlightedTask> */
    public function getHighlightedTasks(): Collection { return $this->highlightedTasks; }

    public function clearHighlightedTasks(): static
    {
        $this->highlightedTasks->clear();
        return $this;
    }

    public function isAssistanceAvailable(): bool { return $this->assistanceAvailable; }

    public function setAssistanceAvailable(bool $assistanceAvailable): static
    {
        $this->assistanceAvailable = $assistanceAvailable;
        return $this;
    }

    public function getEducationRequirement(): string { return $this->educationRequirement; }
    public function setEducationRequirement(string $value): static { $this->educationRequirement = $value; return $this; }
    public function getMinimumEducationLevel(): ?string { return $this->minimumEducationLevel; }
    public function setMinimumEducationLevel(?string $value): static { $this->minimumEducationLevel = $value; return $this; }
    public function getReadingRequirement(): string { return $this->readingRequirement; }
    public function setReadingRequirement(string $value): static { $this->readingRequirement = $value; return $this; }
    public function getWritingRequirement(): string { return $this->writingRequirement; }
    public function setWritingRequirement(string $value): static { $this->writingRequirement = $value; return $this; }
    public function getNumeracyRequirement(): string { return $this->numeracyRequirement; }
    public function setNumeracyRequirement(string $value): static { $this->numeracyRequirement = $value; return $this; }
    public function getPositionKnowledgeRequirement(): string { return $this->positionKnowledgeRequirement; }
    public function setPositionKnowledgeRequirement(string $value): static { $this->positionKnowledgeRequirement = $value; return $this; }

    public function addHighlightedTask(JobPostHighlightedTask $highlight): static
    {
        if (!$this->highlightedTasks->contains($highlight)) {
            $this->highlightedTasks->add($highlight);
            $highlight->setJobPost($this);
        }
        return $this;
    }

}
