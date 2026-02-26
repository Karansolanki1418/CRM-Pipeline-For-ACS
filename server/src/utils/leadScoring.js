const computeLeadScore = (lead) => {
  let score = 0;

  if (lead.parkingType === "basement") score += 2;
  if (lead.propertySizeFlats && lead.propertySizeFlats > 100) score += 2;
  if (lead.decisionMakerKnown) score += 2;
  if (lead.currentEvCount && lead.currentEvCount > 5) score += 2;
  if (Array.isArray(lead.chargerInterest) && lead.chargerInterest.length > 0) score += 2;

  if (score > 10) score = 10;
  if (score < 0) score = 0;

  return score;
};

export default computeLeadScore;

