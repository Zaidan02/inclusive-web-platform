import { useId, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { localizeJobDefinition } from "../../../i18n/jobDefinitions";
import "./candidateProfile.css";

const KNOWLEDGE_LEVELS = ["independent", "with_support", "not_yet"];

export default function PositionInterestSelector({
  definitions,
  interests,
  onToggle,
  onKnowledgeChange,
  translationPrefix,
}) {
  const { t, i18n } = useTranslation(["profile", "dashboards"]);
  const [catalogueOpen, setCatalogueOpen] = useState(false);
  const [query, setQuery] = useState("");
  const catalogueId = useId();
  const searchId = useId();
  const selectedIds = useMemo(
    () => new Set(interests.map((interest) => Number(interest.jobDefinitionId))),
    [interests],
  );
  const labelledDefinitions = definitions.map((definition) => ({
    ...definition,
    localizedName: localizeJobDefinition(t, definition),
  }));
  const selectedDefinitions = interests.map((interest) => {
    const definition = labelledDefinitions.find((item) => Number(item.id) === Number(interest.jobDefinitionId));
    return definition || {
      id: interest.jobDefinitionId,
      slug: interest.slug,
      name: interest.name,
      localizedName: localizeJobDefinition(t, interest),
    };
  });
  const normalizedQuery = query.trim().toLocaleLowerCase(i18n.resolvedLanguage || "en");
  const filteredDefinitions = labelledDefinitions.filter((definition) => (
    !normalizedQuery || definition.localizedName.toLocaleLowerCase(i18n.resolvedLanguage || "en").includes(normalizedQuery)
  ));

  const label = (key, options) => t(`${translationPrefix}.${key}`, options);

  return (
    <div className="position-interest-selector">
      <div className="position-interest-selector__summary">
        <p>
          <strong>{label("positionsTitle")}</strong>{" "}
          {label("positionsHelp")}
        </p>
        <span aria-live="polite">{label("selectedPositions", { count: selectedDefinitions.length })}</span>
      </div>

      {selectedDefinitions.length > 0 ? (
        <div className="position-interest-selector__selected">
          {selectedDefinitions.map((definition) => {
            const interest = interests.find((item) => Number(item.jobDefinitionId) === Number(definition.id));
            return (
              <div className="position-interest-selector__selection" key={definition.id}>
                <div>
                  <strong dir="auto">{definition.localizedName}</strong>
                  <button type="button" onClick={() => onToggle(definition)} aria-label={label("removePosition", { position: definition.localizedName })}>
                    {label("remove")}
                  </button>
                </div>
                <label>
                  <span>{label("knowledgeFor", { position: definition.localizedName })}</span>
                  <select
                    aria-label={label("knowledgeLabel", { position: definition.localizedName })}
                    value={interest?.knowledgeLevel || ""}
                    onChange={(event) => onKnowledgeChange(definition.id, event.target.value)}
                  >
                    <option value="">{label("knowledgeOptional")}</option>
                    {KNOWLEDGE_LEVELS.map((level) => (
                      <option key={level} value={level}>{t(`profile:setup.abilityLevels.${level}`)}</option>
                    ))}
                  </select>
                </label>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="position-interest-selector__empty">{label("noPositions")}</p>
      )}

      <button
        type="button"
        className="position-interest-selector__toggle"
        aria-expanded={catalogueOpen}
        aria-controls={catalogueId}
        onClick={() => setCatalogueOpen((open) => !open)}
      >
        {catalogueOpen ? label("closeCatalogue") : label("browseCatalogue")}
      </button>

      {catalogueOpen && (
        <div id={catalogueId} className="position-interest-selector__catalogue">
          <label htmlFor={searchId}>{label("searchPositions")}</label>
          <input
            id={searchId}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={label("searchPlaceholder")}
          />
          <div className="position-interest-selector__options">
            {filteredDefinitions.length > 0 ? filteredDefinitions.map((definition) => (
              <label key={definition.id} className={selectedIds.has(Number(definition.id)) ? "is-selected" : ""}>
                <input
                  type="checkbox"
                  checked={selectedIds.has(Number(definition.id))}
                  onChange={() => onToggle(definition)}
                />
                <span dir="auto">{definition.localizedName}</span>
              </label>
            )) : <p>{label("noSearchResults")}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
