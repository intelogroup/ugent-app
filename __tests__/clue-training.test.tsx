jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: any, init?: any) => {
      const res = {
        status: init?.status || 200,
        headers: new Map(),
        json: async () => body,
      };
      return res;
    },
  },
}));

import { GET } from '@/app/api/strategy/clues/route';
import fs from 'fs';
import { render, screen, fireEvent } from '@testing-library/react';
import ClueCard from '@/components/strategy/ClueCard';

jest.mock('fs');


describe('ClueCard Component', () => {
  const mockPattern = {
    diseaseName: 'Test Disease',
    mechanism: 'Test Mechanism',
    keySymptoms: ['Symptom A', 'Symptom B'],
    clinicalContext: {
      age: '45',
      gender: 'male',
      physiologyState: 'diabetic',
      onsetPattern: 'acute',
    },
    questionText: 'Test full question content.',
  };

  it('renders clinical context chips and key symptoms', () => {
    const handleReveal = jest.fn();
    render(<ClueCard pattern={mockPattern} isRevealed={false} onReveal={handleReveal} />);

    // Check chips
    expect(screen.getByText('45')).toBeInTheDocument();
    expect(screen.getByText('male')).toBeInTheDocument();
    expect(screen.getByText('diabetic')).toBeInTheDocument();
    expect(screen.getByText('acute')).toBeInTheDocument();

    // Check symptoms
    expect(screen.getByText('Symptom A')).toBeInTheDocument();
    expect(screen.getByText('Symptom B')).toBeInTheDocument();

    // Diagnosis, mechanism and question should not be visible when isRevealed is false
    expect(screen.queryByText('Test Disease')).not.toBeInTheDocument();
    expect(screen.queryByText('Test Mechanism')).not.toBeInTheDocument();
    expect(screen.queryByText('Test full question content.')).not.toBeInTheDocument();

    // Check reveal button
    const button = screen.getByRole('button', { name: /Reveal Diagnosis/i });
    expect(button).toBeInTheDocument();
    fireEvent.click(button);
    expect(handleReveal).toHaveBeenCalledTimes(1);
  });

  it('renders diagnosis, mechanism and full question when revealed', () => {
    const handleReveal = jest.fn();
    render(<ClueCard pattern={mockPattern} isRevealed={true} onReveal={handleReveal} />);

    // Diagnosis, mechanism and question should be visible
    expect(screen.getByText('Test Disease')).toBeInTheDocument();
    expect(screen.getByText('Test Mechanism')).toBeInTheDocument();
    expect(screen.getByText('Test full question content.')).toBeInTheDocument();

    // Reveal button should not be present
    expect(screen.queryByRole('button', { name: /Reveal Diagnosis/i })).not.toBeInTheDocument();
  });
});

describe('Clue Training API Route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns empty feed if file does not exist', async () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);

    const response = await GET();
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({ feed: [] });
  });

  it('correctly filters and parses JSONL data', async () => {
    const mockJsonl = [
      // 1. Valid item
      JSON.stringify({
        textHash: 'hash-1',
        text: 'Full text 1',
        enriched: {
          diseaseName: 'Disease A',
          mechanism: 'Mechanism A',
          keySymptoms: ['Symptom 1'],
          clinicalContext: { age: '20' },
        },
      }),
      // 2. Missing keySymptoms -> should skip
      JSON.stringify({
        textHash: 'hash-2',
        text: 'Full text 2',
        enriched: {
          diseaseName: 'Disease B',
          mechanism: 'Mechanism B',
          keySymptoms: [],
        },
      }),
      // 3. Pending mechanism -> should skip
      JSON.stringify({
        textHash: 'hash-3',
        text: 'Full text 3',
        enriched: {
          diseaseName: 'Disease C',
          mechanism: 'Pending further analysis',
          keySymptoms: ['Symptom 3'],
        },
      }),
      // 4. Valid item with fallback fields
      JSON.stringify({
        enriched: {
          diseaseName: 'Disease D',
          mechanism: 'Mechanism D',
          keySymptoms: ['Symptom 4'],
        },
      }),
    ].join('\n');

    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(mockJsonl);

    const response = await GET();
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.feed).toHaveLength(2);

    // Item 1 verification
    expect(data.feed[0]).toEqual({
      _id: 'hash-1',
      diseaseName: 'Disease A',
      topicType: 'DISEASE',
      mechanism: 'Mechanism A',
      keySymptoms: ['Symptom 1'],
      clinicalContext: { age: '20' },
      questionText: 'Full text 1',
    });

    // Item 4 verification (with defaults)
    expect(data.feed[1]).toEqual({
      _id: 'clue-1', // falls back to clue-1 (length-based)
      diseaseName: 'Disease D',
      topicType: 'DISEASE',
      mechanism: 'Mechanism D',
      keySymptoms: ['Symptom 4'],
      clinicalContext: '',
      questionText: '',
    });
  });

  it('limits the feed to 50 items', async () => {
    const validItem = {
      textHash: 'hash',
      enriched: {
        diseaseName: 'Disease',
        mechanism: 'Mechanism',
        keySymptoms: ['Symptom'],
      },
    };
    const mockJsonl = Array(60).fill(JSON.stringify(validItem)).join('\n');

    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(mockJsonl);

    const response = await GET();
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.feed).toHaveLength(50);
  });
});
