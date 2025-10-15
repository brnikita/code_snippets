/**
 * Fixed Practice Exam Form Component
 * 
 * Fixes:
 * 1. Fully controlled inputs with proper state initialization
 * 2. Client-side only rendering for time-sensitive components
 * 3. Consistent date handling between server and client
 * 4. No conditional rendering that differs between SSR and CSR
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Question {
  id: string;
  text: string;
  options: string[];
}

interface ExamFormProps {
  examId: string;
  questions: Question[];
  startedAt: string; // ISO string from server
}

export default function ExamForm({ examId, questions, startedAt }: ExamFormProps) {
  const router = useRouter();
  
  // ✅ Initialize all answers with empty strings (controlled inputs)
  const [answers, setAnswers] = useState<Record<string, string>>(() => 
    questions.reduce((acc, q) => ({ ...acc, [q.id]: '' }), {})
  );
  
  const [currentStep, setCurrentStep] = useState(0);
  const [isClient, setIsClient] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  
  // ✅ Use effect to enable client-only features after hydration
  useEffect(() => {
    setIsClient(true);
    
    // Restore from localStorage only on client
    const saved = localStorage.getItem(`exam-${examId}-answers`);
    if (saved) {
      try {
        setAnswers(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to restore answers', e);
      }
    }
  }, [examId]);
  
  // ✅ Timer runs only on client
  useEffect(() => {
    if (!isClient) return;
    
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
      setElapsedTime(elapsed);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isClient, startedAt]);
  
  // ✅ Save to localStorage only on client
  useEffect(() => {
    if (!isClient) return;
    localStorage.setItem(`exam-${examId}-answers`, JSON.stringify(answers));
  }, [answers, examId, isClient]);
  
  const handleAnswerChange = (questionId: string, value: string) => {
    // ✅ Immutable state update
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };
  
  const handleNext = () => {
    if (currentStep < questions.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };
  
  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };
  
  const handleSubmit = async () => {
    try {
      const response = await fetch(`/api/exams/${examId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      });
      
      if (!response.ok) throw new Error('Submission failed');
      
      const result = await response.json();
      localStorage.removeItem(`exam-${examId}-answers`);
      router.push(`/exams/${examId}/results/${result.resultId}`);
    } catch (error) {
      console.error('Submit error:', error);
      alert('Failed to submit exam. Please try again.');
    }
  };
  
  const currentQuestion = questions[currentStep];
  const progress = ((currentStep + 1) / questions.length) * 100;
  const answeredCount = Object.values(answers).filter(a => a).length;
  
  return (
    <div className="max-w-3xl mx-auto p-6">
      {/* ✅ Progress bar - no hydration issues */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Question {currentStep + 1} of {questions.length}</span>
          <span>{answeredCount} answered</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      
      {/* ✅ Timer - only renders on client after hydration */}
      {isClient && (
        <div className="mb-4 text-right text-sm text-gray-600">
          Time: {Math.floor(elapsedTime / 60)}:{(elapsedTime % 60).toString().padStart(2, '0')}
        </div>
      )}
      
      {/* ✅ Question card - consistent rendering */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">
          {currentQuestion.text}
        </h2>
        
        <div className="space-y-3">
          {currentQuestion.options.map((option, idx) => {
            const optionValue = String.fromCharCode(65 + idx); // A, B, C, D
            const isSelected = answers[currentQuestion.id] === optionValue;
            
            return (
              <label
                key={idx}
                className={`
                  flex items-start p-4 border-2 rounded-lg cursor-pointer
                  transition-all duration-200
                  ${isSelected 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                  }
                `}
              >
                <input
                  type="radio"
                  name={currentQuestion.id}
                  value={optionValue}
                  checked={isSelected} // ✅ Controlled input
                  onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                  className="mt-1 mr-3"
                />
                <div>
                  <span className="font-medium">{optionValue}.</span> {option}
                </div>
              </label>
            );
          })}
        </div>
      </div>
      
      {/* ✅ Navigation buttons - no layout shift */}
      <div className="flex justify-between items-center">
        <button
          onClick={handlePrevious}
          disabled={currentStep === 0}
          className="px-6 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
        >
          Previous
        </button>
        
        <div className="text-sm text-gray-600">
          {answeredCount === questions.length && (
            <span className="text-green-600 font-medium">✓ All answered</span>
          )}
        </div>
        
        {currentStep < questions.length - 1 ? (
          <button
            onClick={handleNext}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Next
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={answeredCount < questions.length}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Submit Exam
          </button>
        )}
      </div>
    </div>
  );
}

