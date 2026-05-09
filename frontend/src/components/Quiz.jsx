import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle2, XCircle, RotateCcw, ArrowRight, Trophy, 
  Lightbulb, HelpCircle, Sparkles, Target
} from 'lucide-react';
import { Button } from './ui/button';
import confetti from '../utils/confetti';

export const Quiz = ({ questions, onComplete, moduleName, previousAttempts = 0, bestScore = 0, passingScore: passingScoreProp }) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [selectedAnswers, setSelectedAnswers] = useState([]); // for multi-select
  const [shortAnswer, setShortAnswer] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);
  const [quizComplete, setQuizComplete] = useState(false);
  const [answers, setAnswers] = useState([]);
  const [attemptCount, setAttemptCount] = useState(previousAttempts);

  // Allow the lesson creator to override the pass threshold (1–100). Default 70.
  const passingScore = (() => {
    const n = Number(passingScoreProp);
    if (Number.isFinite(n) && n > 0 && n <= 100) return Math.round(n);
    return 70;
  })();
  const passingQuestions = Math.ceil(questions.length * (passingScore / 100));

  // Get current question data
  const question = questions[currentQuestion];

  // Normalise the type field — admin/legacy data may use different names
  const normaliseType = (rawType, q) => {
    const t = String(rawType || '').toLowerCase().replace(/_/g, '-');
    if (t === 'multiple-choice' || t === 'mcq') return 'mcq';
    if (t === 'multi-select' || t === 'multiselect' || t === 'checkbox') return 'multi-select';
    if (t === 'true-false' || t === 'truefalse' || t === 'boolean') return 'true-false';
    if (
      t === 'short-answer' || t === 'descriptive' || t === 'text' ||
      t === 'free-text' || t === 'open-ended' || t === 'short'
    ) {
      return 'short-answer';
    }
    // Fall back: if there are options, treat as MCQ; else as short-answer text.
    if (q && Array.isArray(q.options) && q.options.length > 0) return 'mcq';
    return 'short-answer';
  };
  const questionType = normaliseType(question?.type, question);

  // Check if short answer is correct (keyword matching)
  const checkShortAnswer = useCallback((answer, correctAnswer) => {
    if (!answer || !correctAnswer) return false;
    const normalizedAnswer = answer.toLowerCase().trim();
    const normalizedCorrect = String(correctAnswer).toLowerCase().trim();
    
    // Check for exact match or contains the key answer
    if (normalizedAnswer === normalizedCorrect) return true;
    if (normalizedAnswer.includes(normalizedCorrect)) return true;
    if (normalizedCorrect.includes(normalizedAnswer) && normalizedAnswer.length > 3) return true;
    
    // Check for keyword matches (split by spaces/commas)
    const keywords = normalizedCorrect.split(/[\s,]+/).filter(k => k.length > 2);
    const matchCount = keywords.filter(k => normalizedAnswer.includes(k)).length;
    return matchCount >= Math.ceil(keywords.length * 0.5);
  }, []);

  // Handle answer selection for MCQ/True-False
  const handleAnswerSelect = (answerIndex) => {
    if (showResult) return;
    setSelectedAnswer(answerIndex);
  };

  // Toggle answer for multi-select
  const handleAnswerToggle = (answerIndex) => {
    if (showResult) return;
    setSelectedAnswers((prev) =>
      prev.includes(answerIndex)
        ? prev.filter((i) => i !== answerIndex)
        : [...prev, answerIndex].sort((a, b) => a - b),
    );
  };

  // Handle short answer input
  const handleShortAnswerChange = (e) => {
    if (showResult) return;
    setShortAnswer(e.target.value);
  };

  // Check the answer
  const handleSubmit = useCallback(() => {
    let isCorrect = false;

    if (questionType === 'short-answer') {
      if (!shortAnswer.trim()) return;
      isCorrect = checkShortAnswer(shortAnswer, question.correctAnswer);
    } else if (questionType === 'multi-select') {
      if (!selectedAnswers || selectedAnswers.length === 0) return;
      const correct = Array.isArray(question.correctAnswers) ? [...question.correctAnswers].sort() : [];
      const chosen = [...selectedAnswers].sort();
      isCorrect =
        correct.length === chosen.length &&
        correct.every((v, i) => v === chosen[i]);
    } else {
      if (selectedAnswer === null) return;

      if (questionType === 'true-false') {
        const correctIndex = question.correctAnswer === true ? 0 : 1;
        isCorrect = selectedAnswer === correctIndex;
      } else {
        isCorrect = selectedAnswer === question.correctAnswer;
      }
    }

    setShowResult(true);
    setAnswers(prev => [...prev, {
      questionIndex: currentQuestion,
      selected:
        questionType === 'short-answer' ? shortAnswer :
        questionType === 'multi-select' ? selectedAnswers :
        selectedAnswer,
      correct: isCorrect,
      type: questionType
    }]);

    if (isCorrect) {
      setScore(prev => prev + 1);
    }
  }, [selectedAnswer, selectedAnswers, shortAnswer, question, currentQuestion, questionType, checkShortAnswer]);

  // Move to next question or finish
  const handleNext = useCallback(() => {
    setShowExplanation(false);
    
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
      setSelectedAnswer(null);
      setSelectedAnswers([]);
      setShortAnswer('');
      setShowResult(false);
    } else {
      const finalScore = Math.round((score / questions.length) * 100);
      const passed = score >= passingQuestions;
      setQuizComplete(true);
      setAttemptCount(prev => prev + 1);
      
      if (passed) {
        confetti();
      }
      
      onComplete(finalScore, passed, attemptCount + 1);
    }
  }, [currentQuestion, questions.length, score, passingQuestions, onComplete, attemptCount]);

  // Retry the quiz
  const handleRetry = () => {
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setSelectedAnswers([]);
    setShortAnswer('');
    setShowResult(false);
    setShowExplanation(false);
    setScore(0);
    setQuizComplete(false);
    setAnswers([]);
  };

  // Render options for MCQ
  const renderMCQOptions = () => (
    <div className="space-y-3" role="radiogroup" aria-label="Answer options">
      {question.options.map((option, index) => {
        const isSelected = selectedAnswer === index;
        const isCorrect = index === question.correctAnswer;
        
        let buttonStyle = 'bg-white border-slate-200 hover:border-primary/50 hover:bg-primary/5';
        
        if (showResult) {
          if (isCorrect) {
            buttonStyle = 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-200';
          } else if (isSelected && !isCorrect) {
            buttonStyle = 'bg-rose-50 border-rose-300';
          } else {
            buttonStyle = 'bg-slate-50 border-slate-200 opacity-60';
          }
        } else if (isSelected) {
          buttonStyle = 'bg-primary/10 border-primary ring-2 ring-primary/20';
        }

        return (
          <motion.button
            key={index}
            onClick={() => handleAnswerSelect(index)}
            disabled={showResult}
            whileHover={!showResult ? { scale: 1.01, x: 4 } : {}}
            whileTap={!showResult ? { scale: 0.99 } : {}}
            className={`w-full p-4 rounded-2xl text-left transition-all flex items-center gap-4 border-2 ${buttonStyle}`}
            data-testid={`quiz-option-${index}`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold transition-all ${
              showResult && isCorrect 
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' 
                : showResult && isSelected && !isCorrect
                  ? 'bg-rose-500 text-white'
                  : isSelected 
                    ? 'bg-primary text-white shadow-lg shadow-primary/30' 
                    : 'bg-slate-100 text-slate-500'
            }`}>
              {String.fromCharCode(65 + index)}
            </div>
            <span className={`flex-grow font-medium ${showResult && !isCorrect && !isSelected ? 'text-slate-400' : 'text-slate-700'}`}>
              {option}
            </span>
            {showResult && isCorrect && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex-shrink-0"
              >
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
              </motion.div>
            )}
            {showResult && isSelected && !isCorrect && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex-shrink-0"
              >
                <XCircle className="w-6 h-6 text-rose-500" />
              </motion.div>
            )}
          </motion.button>
        );
      })}
    </div>
  );

  // Render Multi-Select options (checkbox-style; multiple correct answers)
  const renderMultiSelectOptions = () => {
    const correctSet = new Set(Array.isArray(question.correctAnswers) ? question.correctAnswers : []);
    return (
      <div className="space-y-3" role="group" aria-label="Multi-select answer options">
        <p className="text-xs font-medium text-slate-500 mb-1">
          Select all that apply
        </p>
        {question.options.map((option, index) => {
          const isSelected = selectedAnswers.includes(index);
          const isCorrect = correctSet.has(index);

          let buttonStyle = 'bg-white border-slate-200 hover:border-primary/50 hover:bg-primary/5';
          if (showResult) {
            if (isCorrect && isSelected) {
              buttonStyle = 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-200';
            } else if (isCorrect && !isSelected) {
              buttonStyle = 'bg-emerald-50/60 border-emerald-200';
            } else if (!isCorrect && isSelected) {
              buttonStyle = 'bg-rose-50 border-rose-300';
            } else {
              buttonStyle = 'bg-slate-50 border-slate-200 opacity-60';
            }
          } else if (isSelected) {
            buttonStyle = 'bg-primary/10 border-primary ring-2 ring-primary/20';
          }

          return (
            <motion.button
              key={index}
              onClick={() => handleAnswerToggle(index)}
              disabled={showResult}
              whileHover={!showResult ? { scale: 1.01, x: 4 } : {}}
              whileTap={!showResult ? { scale: 0.99 } : {}}
              className={`w-full p-4 rounded-2xl text-left transition-all flex items-center gap-4 border-2 ${buttonStyle}`}
              data-testid={`quiz-multi-option-${index}`}
            >
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold transition-all ${
                  showResult && isCorrect
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200'
                    : showResult && isSelected && !isCorrect
                      ? 'bg-rose-500 text-white'
                      : isSelected
                        ? 'bg-primary text-white shadow-lg shadow-primary/30'
                        : 'bg-slate-100 text-slate-500'
                }`}
              >
                {isSelected ? <CheckCircle2 className="w-5 h-5" /> : String.fromCharCode(65 + index)}
              </div>
              <span className={`flex-grow font-medium ${showResult && !isCorrect && !isSelected ? 'text-slate-400' : 'text-slate-700'}`}>
                {option}
              </span>
              {showResult && isCorrect && (
                <CheckCircle2 className="w-6 h-6 text-emerald-500 flex-shrink-0" />
              )}
              {showResult && isSelected && !isCorrect && (
                <XCircle className="w-6 h-6 text-rose-500 flex-shrink-0" />
              )}
            </motion.button>
          );
        })}
      </div>
    );
  };

  // Render True/False options
  const renderTrueFalseOptions = () => {
    const options = [
      { label: 'True', value: true, icon: '✓' },
      { label: 'False', value: false, icon: '✗' }
    ];

    return (
      <div className="grid grid-cols-2 gap-4">
        {options.map((option, index) => {
          const isSelected = selectedAnswer === index;
          const isCorrectAnswer = question.correctAnswer === option.value;
          const correctIndex = question.correctAnswer === true ? 0 : 1;
          
          let buttonStyle = 'bg-white border-slate-200 hover:border-primary/50';
          
          if (showResult) {
            if (isCorrectAnswer) {
              buttonStyle = 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-200';
            } else if (isSelected) {
              buttonStyle = 'bg-rose-50 border-rose-300';
            } else {
              buttonStyle = 'bg-slate-50 border-slate-200 opacity-60';
            }
          } else if (isSelected) {
            buttonStyle = 'bg-primary/10 border-primary ring-2 ring-primary/20';
          }

          return (
            <motion.button
              key={option.label}
              onClick={() => handleAnswerSelect(index)}
              disabled={showResult}
              whileHover={!showResult ? { scale: 1.02 } : {}}
              whileTap={!showResult ? { scale: 0.98 } : {}}
              className={`p-6 rounded-2xl text-center transition-all border-2 ${buttonStyle}`}
              data-testid={`quiz-option-${option.label.toLowerCase()}`}
            >
              <div className={`w-14 h-14 mx-auto mb-3 rounded-xl flex items-center justify-center text-2xl font-bold transition-all ${
                showResult && isCorrectAnswer
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200'
                  : showResult && isSelected && !isCorrectAnswer
                    ? 'bg-rose-500 text-white'
                    : isSelected
                      ? 'bg-primary text-white shadow-lg shadow-primary/30'
                      : 'bg-slate-100 text-slate-500'
              }`}>
                {option.icon}
              </div>
              <span className="font-semibold text-lg text-slate-700">{option.label}</span>
              {showResult && isCorrectAnswer && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-2 text-emerald-600 text-sm font-medium"
                >
                  Correct!
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>
    );
  };

  // Render Short Answer input
  const renderShortAnswer = () => {
    const isCorrect = showResult && checkShortAnswer(shortAnswer, question.correctAnswer);
    
    return (
      <div className="space-y-4">
        <div className="relative">
          <input
            type="text"
            value={shortAnswer}
            onChange={handleShortAnswerChange}
            disabled={showResult}
            placeholder="Type your answer here..."
            className={`w-full p-4 rounded-2xl border-2 text-lg font-medium transition-all outline-none ${
              showResult
                ? isCorrect
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                  : 'bg-rose-50 border-rose-300 text-rose-700'
                : 'bg-white border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20'
            }`}
            data-testid="quiz-short-answer-input"
          />
          {showResult && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute right-4 top-1/2 -translate-y-1/2"
            >
              {isCorrect ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
              ) : (
                <XCircle className="w-6 h-6 text-rose-500" />
              )}
            </motion.div>
          )}
        </div>
        
        {showResult && !isCorrect && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-amber-50 border border-amber-200 rounded-xl p-4"
          >
            <div className="flex items-start gap-3">
              <Target className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800">Expected answer:</p>
                <p className="text-amber-700 font-semibold">{String(question.correctAnswer)}</p>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    );
  };

  // Quiz Complete Screen
  if (quizComplete) {
    const finalScore = Math.round((score / questions.length) * 100);
    const passed = score >= passingQuestions;
    const isNewBest = finalScore > bestScore;
    
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-8" aria-live="polite"
      >
        <motion.div 
          className={`w-24 h-24 mx-auto mb-6 rounded-3xl flex items-center justify-center ${
            passed ? 'bg-gradient-to-br from-emerald-400 to-teal-500' : 'bg-gradient-to-br from-rose-400 to-pink-500'
          }`}
          animate={passed ? { rotate: [0, -10, 10, -10, 0] } : {}}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          {passed ? (
            <Trophy className="w-12 h-12 text-white" />
          ) : (
            <RotateCcw className="w-12 h-12 text-white" />
          )}
        </motion.div>
        
        <motion.h3 
          className="text-3xl font-bold text-slate-900 mb-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {passed ? '🎉 Awesome Work!' : 'Almost There!'}
        </motion.h3>
        
        <motion.div 
          className="mb-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div className="text-5xl font-bold bg-gradient-to-r from-primary to-violet-600 bg-clip-text text-transparent mb-1">
            {finalScore}%
          </div>
          <p className="text-slate-500">
            {score} out of {questions.length} correct
          </p>
        </motion.div>

        {/* Stats Row */}
        <motion.div 
          className="flex justify-center gap-6 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="text-center">
            <div className="text-sm text-slate-500">Attempts</div>
            <div className="text-xl font-bold text-slate-700">{attemptCount}</div>
          </div>
          <div className="w-px bg-slate-200" />
          <div className="text-center">
            <div className="text-sm text-slate-500">Best Score</div>
            <div className="text-xl font-bold text-primary flex items-center justify-center gap-1">
              {Math.max(finalScore, bestScore)}%
              {isNewBest && passed && <Sparkles className="w-4 h-4 text-amber-500" />}
            </div>
          </div>
          <div className="w-px bg-slate-200" />
          <div className="text-center">
            <div className="text-sm text-slate-500">Required</div>
            <div className="text-xl font-bold text-slate-700">{passingScore}%</div>
          </div>
        </motion.div>
        
        <motion.p 
          className="text-slate-600 mb-8 max-w-md mx-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {passed 
            ? `Great job completing "${moduleName}"! You've unlocked the next module.`
            : `You need ${passingScore}% to pass. Review the content and try again - you've got this!`
          }
        </motion.p>
        
        {!passed && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Button
              onClick={handleRetry}
              className="bg-gradient-to-r from-primary to-violet-600 hover:from-primary/90 hover:to-violet-600/90 text-white px-8 py-4 rounded-2xl font-semibold text-lg shadow-lg shadow-primary/30 transition-all"
              data-testid="quiz-retry-btn"
            >
              <RotateCcw className="w-5 h-5 mr-2" />
              Try Again
            </Button>
          </motion.div>
        )}
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
          <span className="bg-primary/10 text-primary px-3 py-1 rounded-full">
            {currentQuestion + 1}/{questions.length}
          </span>
        </div>
        <div className="flex-grow h-3 bg-slate-100 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-primary to-violet-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${((currentQuestion + (showResult ? 1 : 0)) / questions.length) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <div className="flex items-center gap-1 text-sm font-medium text-emerald-600">
          <CheckCircle2 className="w-4 h-4" />
          {score}
        </div>
      </div>

      {/* Question Type Badge */}
      <div className="flex items-center gap-2">
        <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${
          questionType === 'mcq'
            ? 'bg-blue-100 text-blue-700'
            : questionType === 'multi-select'
              ? 'bg-indigo-100 text-indigo-700'
              : questionType === 'true-false'
                ? 'bg-purple-100 text-purple-700'
                : 'bg-amber-100 text-amber-700'
        }`}>
          {questionType === 'mcq'
            ? 'Multiple Choice'
            : questionType === 'multi-select'
              ? 'Multi-Select'
              : questionType === 'true-false'
                ? 'True or False'
                : 'Descriptive'}
        </span>
        {question.explanation && (
          <span className="text-xs text-slate-400">• Explanation available</span>
        )}
      </div>

      {/* Question */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestion}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.3 }}
        >
          <h4 className="text-xl font-bold text-slate-900 mb-4 leading-relaxed" data-testid="quiz-question">
            {question.question}
          </h4>

          {/* Optional question image */}
          {(question.image_url || question.image_asset_id) && (
            <div className="mb-6 rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 inline-block max-w-full">
              <img
                src={question.image_url || `${(process.env.REACT_APP_BACKEND_URL || '').replace(/\/+$/, '')}/api/content/media/${question.image_asset_id}`}
                alt="Question illustration"
                className="max-h-72 object-contain"
                loading="lazy"
              />
            </div>
          )}

          {/* Render appropriate question type */}
          {questionType === 'mcq' && renderMCQOptions()}
          {questionType === 'multi-select' && renderMultiSelectOptions()}
          {questionType === 'true-false' && renderTrueFalseOptions()}
          {questionType === 'short-answer' && renderShortAnswer()}
        </motion.div>
      </AnimatePresence>

      {/* Explanation Panel */}
      <AnimatePresence>
        {showResult && showExplanation && question.explanation && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Lightbulb className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h5 className="font-semibold text-blue-900 mb-1">Why this is the answer</h5>
                  <p className="text-blue-800 leading-relaxed">{question.explanation}</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-100">
        {showResult && question.explanation && (
          <Button
            variant="ghost"
            onClick={() => setShowExplanation(!showExplanation)}
            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            data-testid="quiz-explain-btn"
          >
            <HelpCircle className="w-4 h-4 mr-2" />
            {showExplanation ? 'Hide Explanation' : 'Explain Answer'}
          </Button>
        )}
        
        <div className="flex gap-3 ml-auto">
          {!showResult ? (
            <Button
              onClick={handleSubmit}
              disabled={
                questionType === 'short-answer'
                  ? !shortAnswer.trim()
                  : questionType === 'multi-select'
                    ? selectedAnswers.length === 0
                    : selectedAnswer === null
              }
              className="bg-gradient-to-r from-primary to-violet-600 hover:from-primary/90 hover:to-violet-600/90 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transition-all"
              data-testid="quiz-submit-btn"
            >
              Check Answer
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-emerald-200 transition-all"
              data-testid="quiz-next-btn"
            >
              {currentQuestion < questions.length - 1 ? 'Next Question' : 'See Results'}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Quiz;
