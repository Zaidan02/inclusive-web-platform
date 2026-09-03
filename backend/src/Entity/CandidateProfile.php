<?php

namespace App\Entity;

use App\Repository\CandidateProfileRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: CandidateProfileRepository::class)]
class CandidateProfile
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\OneToOne(inversedBy: 'candidateProfile')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?User $user = null;

    /** @var Collection<int, Disability> */
    #[ORM\ManyToMany(targetEntity: Disability::class)]
    #[ORM\JoinTable(name: 'candidate_profile_disability')]
    private Collection $disabilities;

    /** @var Collection<int, CandidateTaskSkill> */
    #[ORM\OneToMany(mappedBy: 'candidateProfile', targetEntity: CandidateTaskSkill::class, cascade: ['persist', 'remove'], orphanRemoval: true)]
    #[ORM\OrderBy(['confirmedAt' => 'DESC'])]
    private Collection $taskSkills;

    /** @var Collection<int, CandidatePositionInterest> */
    #[ORM\OneToMany(mappedBy: 'candidateProfile', targetEntity: CandidatePositionInterest::class, cascade: ['persist', 'remove'], orphanRemoval: true)]
    #[ORM\OrderBy(['id' => 'ASC'])]
    private Collection $positionInterests;

    #[ORM\Column(length: 20, options: ['default' => 'both'])]
    private string $opportunityPreference = 'both';

    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $updatedAt = null;

    #[ORM\Column(length: 50, nullable: true)]
    private ?string $educationLevel = null;

    #[ORM\Column(length: 30, nullable: true)]
    private ?string $readingAbility = null;

    #[ORM\Column(length: 30, nullable: true)]
    private ?string $writingAbility = null;

    #[ORM\Column(length: 30, nullable: true)]
    private ?string $numeracyAbility = null;

    #[ORM\Column(length: 100, nullable: true)]
    private ?string $firstName = null;

    #[ORM\Column(length: 100, nullable: true)]
    private ?string $lastName = null;

    #[ORM\Column(length: 40, nullable: true)]
    private ?string $phone = null;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $location = null;

    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $about = null;

    public function __construct()
    {
        $this->disabilities = new ArrayCollection();
        $this->taskSkills = new ArrayCollection();
        $this->positionInterests = new ArrayCollection();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getUser(): ?User
    {
        return $this->user;
    }

    public function setUser(User $user): static
    {
        $this->user = $user;
        return $this;
    }

    public function getSelectedDisabilities(): array
    {
        return $this->disabilities
            ->map(static fn (Disability $disability): string => (string) $disability->getName())
            ->toArray();
    }

    /** @return Collection<int, Disability> */
    public function getDisabilities(): Collection
    {
        return $this->disabilities;
    }

    /** @param iterable<Disability> $disabilities */
    public function replaceDisabilities(iterable $disabilities): static
    {
        $this->disabilities->clear();
        foreach ($disabilities as $disability) {
            if (!$this->disabilities->contains($disability)) {
                $this->disabilities->add($disability);
            }
        }
        return $this;
    }

    public function addDisability(Disability $disability): static
    {
        if (!$this->disabilities->contains($disability)) {
            $this->disabilities->add($disability);
        }
        return $this;
    }

    /** @return Collection<int, CandidateTaskSkill> */
    public function getTaskSkills(): Collection
    {
        return $this->taskSkills;
    }

    public function addTaskSkill(CandidateTaskSkill $taskSkill): static
    {
        if (!$this->taskSkills->contains($taskSkill)) {
            $this->taskSkills->add($taskSkill);
            $taskSkill->setCandidateProfile($this);
        }
        return $this;
    }

    public function removeTaskSkill(CandidateTaskSkill $taskSkill): static
    {
        $this->taskSkills->removeElement($taskSkill);
        return $this;
    }

    public function getOpportunityPreference(): string { return $this->opportunityPreference; }
    public function setOpportunityPreference(string $preference): static { $this->opportunityPreference = $preference; return $this; }

    /** @return Collection<int, CandidatePositionInterest> */
    public function getPositionInterests(): Collection { return $this->positionInterests; }

    public function addPositionInterest(CandidatePositionInterest $interest): static
    {
        if (!$this->positionInterests->contains($interest)) {
            $this->positionInterests->add($interest);
            $interest->setCandidateProfile($this);
        }
        return $this;
    }

    public function clearPositionInterests(): static
    {
        $this->positionInterests->clear();
        return $this;
    }

    public function removePositionInterest(CandidatePositionInterest $interest): static
    {
        $this->positionInterests->removeElement($interest);
        return $this;
    }

    public function getUpdatedAt(): ?\DateTimeImmutable
    {
        return $this->updatedAt;
    }

    public function setUpdatedAt(?\DateTimeImmutable $updatedAt): static
    {
        $this->updatedAt = $updatedAt;
        return $this;
    }

    public function getEducationLevel(): ?string { return $this->educationLevel; }
    public function setEducationLevel(?string $level): static { $this->educationLevel = $level; return $this; }
    public function getReadingAbility(): ?string { return $this->readingAbility; }
    public function setReadingAbility(?string $value): static { $this->readingAbility = $value; return $this; }
    public function getWritingAbility(): ?string { return $this->writingAbility; }
    public function setWritingAbility(?string $value): static { $this->writingAbility = $value; return $this; }
    public function getNumeracyAbility(): ?string { return $this->numeracyAbility; }
    public function setNumeracyAbility(?string $value): static { $this->numeracyAbility = $value; return $this; }
    public function getFirstName(): ?string { return $this->firstName; }
    public function setFirstName(?string $value): static { $this->firstName = $value; return $this; }
    public function getLastName(): ?string { return $this->lastName; }
    public function setLastName(?string $value): static { $this->lastName = $value; return $this; }
    public function getPhone(): ?string { return $this->phone; }
    public function setPhone(?string $value): static { $this->phone = $value; return $this; }
    public function getLocation(): ?string { return $this->location; }
    public function setLocation(?string $value): static { $this->location = $value; return $this; }
    public function getAbout(): ?string { return $this->about; }
    public function setAbout(?string $value): static { $this->about = $value; return $this; }
}
