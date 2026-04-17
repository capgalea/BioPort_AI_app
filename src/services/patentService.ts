export interface Patent {
  patent_id: string;
  patent_title: string;
  patent_abstract: string;
  patent_date: string;
  patent_type: string;
  assignees: Array<{
    assignee_organization: string | null;
    assignee_individual_name_first: string | null;
    assignee_individual_name_last: string | null;
  }>;
  inventors: Array<{b
    inventor_name_first: string | null;
    inventor_name_last: string | null;
  }>;
}

export interface PatentSearchResponse {
  error: boolean;
  count: number;
  total_hits: number;
  patents: Patent[];
}

export const searchPatents = async (query: string): Promise<PatentSearchResponse> => {
  const response = await fetch("/api/patents/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || "Failed to search patents");
  }

  return response.json();
};

export const getPatentDetails = async (id: string): Promise<Patent> => {
  const response = await fetch(`/api/patents/${id}`);

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || "Failed to fetch patent details");
  }

  const data = await response.json();
  return data.patents[0];
};
