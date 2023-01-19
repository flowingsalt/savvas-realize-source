angular.module('Realize.reporting.grades.StudentItemAnalysisSvc', [
    'Realize.constants.questionType'
])
    .service('StudentItemAnalysisSvc', [
        '$location',
        '$routeParams',
        'QUESTION_TYPE',
        function($location, $routeParams, QUESTION_TYPE) {
            'use strict';

            this.positionToLabel = function(pos) {
                var code = 'A'.charCodeAt() + pos;
                return String.fromCharCode(code);
            };

            this.calculateScore = function(score) {
                // special case for an assessment with no questions: 0 out of 0 = 100%
                if (score.maxPoints === 0) {
                    return 100;
                }

                return Math.round(100 * score.points / score.maxPoints);
            };

            this.switchAssessment = function(itemAnalysis, idx) {
                var assessment, sessionId, leftPartPath, path;

                assessment = itemAnalysis.assessments[idx];
                if (!assessment || !assessment.assessmentSessionId) {
                    return;
                }

                sessionId = assessment.assessmentSessionId;

                leftPartPath = $location.path().split('/assessments')[0];
                path = [leftPartPath, 'assessments', sessionId,
                        $routeParams.filterStartDate, $routeParams.filterEndDate, idx].join('/');

                $location.path(path);
            };

            this.isPaf = function(itemAnalysis) {
                var questionsDef = itemAnalysis.current.questionResponseDefinitions,
                    pafQuestions = _.filter(questionsDef, function(def) {
                        return def.question.questionType !== QUESTION_TYPE.MULTIPLE_CHOICE &&
                            def.question.questionType !== QUESTION_TYPE.GRIDDED_RESPONSE;
                    });

                return pafQuestions.length > 0;
            };

            // convert assessment summary info a form that is easier to use.
            this.getFormattedQuestionData = function(itemAnalysis) {
                var self = this,
                    formattedQuestionData = [];

                angular.forEach(itemAnalysis.current.assessment.questions, function(question, index) {
                    var questionId = question.id,
                        questionData = {
                            questionNumber: index,
                            questionText: question.text
                        },
                        isGriddedResponse = question.questionType === QUESTION_TYPE.GRIDDED_RESPONSE,
                        questionResponse,
                        userResponse,
                        correctAnswer;

                    questionResponse = _.find(itemAnalysis.current.questionResponseDefinitions, function(response) {
                        return response.question.id === questionId;
                    });

                    if (questionResponse) {
                        userResponse = _.last(questionResponse.userResponses);
                        if (userResponse) {
                            if (isGriddedResponse) {
                                questionData.responseText = userResponse.responseValue;
                                questionData.responseLabel = '';
                            } else {
                                questionData.responseText = userResponse.text;
                                questionData.responseLabel = self.positionToLabel(userResponse.position);
                            }
                            questionData.isCorrect = userResponse.score.correct;
                            questionData.isAnswered = userResponse.answered;
                        }

                        correctAnswer = questionResponse.correctAnswer;
                        if (correctAnswer) {
                            if (isGriddedResponse) {
                                questionData.correctText = correctAnswer.responseValue;
                                questionData.correctLabel = '';
                            } else {
                                questionData.correctText = correctAnswer.text;
                                questionData.correctLabel = self.positionToLabel(correctAnswer.position);
                            }
                        }
                    }

                    formattedQuestionData.push(questionData);
                });

                return formattedQuestionData;
            };
        }
    ]);
