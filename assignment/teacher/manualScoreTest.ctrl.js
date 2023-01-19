angular.module('Realize.assignment.teacher.manualScoreTestCtrl', [
    'Realize.analytics',
    'Realize.common.alerts',
    'Realize.assessment.assessmentDataService',
    'webStorageModule',
])
    .constant('MANUAL_SCORE', {
        MIN_VALUE: -999.99,
        MAX_VALUE: 999.99,
        MAX_LENGTH: 6
    })
    .controller('AssignmentManualScoreTestCtrl', [
        '$scope',
        '$rootScope',
        '$location',
        '$log',
        'Assessment',
        'lwcI18nFilter',
        'ClassAndAssignmentData',
        '$routeParams',
        'AssessmentData',
        'InlineAlertService',
        'MANUAL_SCORE',
        'KEY_CODES',
        'UnsavedChangesModal',
        '$window',
        '$timeout',
        'rubricEventTracking',
        'telemetryUtilitiesService',
        'webStorage',
        'urlUtilService',
        'NavigationService',
        function($scope, $rootScope, $location, $log, Assessment, lwcI18nFilter, ClassAndAssignmentData,
            $routeParams, AssessmentData, InlineAlertService, MANUAL_SCORE, KEY_CODES, UnsavedChangesModal, $window,
            $timeout, rubricEventTracking, telemetryUtilitiesService, webStorage, urlUtilService, NavigationService) {
            'use strict';

            $scope.assessmentSummary = AssessmentData.summaryResponse;
            $scope.assessmentSessionId = AssessmentData.sessionId;
            $scope.assessmentResult = AssessmentData.resultResponse;

            $scope.assignment = ClassAndAssignmentData.assignment;
            $scope.completedStudentList = [];

            $scope.MIN_VALUE = MANUAL_SCORE.MIN_VALUE;
            $scope.MAX_VALUE = MANUAL_SCORE.MAX_VALUE;
            $scope.MAX_LENGTH = MANUAL_SCORE.MAX_LENGTH;
            $scope.openRubricPanel = false;
            $scope.backUrl = $location.search().backUrl;

            if (!!$scope.backUrl) {
                webStorage.add('lastUpdatedUserAssignmentId', $routeParams.userAssignmentId);
            }

            $scope.focusOnQuestion = function(manualScore, index, event) {
                $scope.focusOnTextboxEvent = {
                    type: event.type,
                    textBoxToQuestionMappingId: manualScore.responseIdentifiers[0]
                };
                this.manualScores[index].forEach(function(manualScoreBox) {
                    if (manualScoreBox.onFocus) {
                        manualScoreBox.onFocus = false;
                    }
                });
                manualScore.onFocus = true;
            };

            $scope.showingQuestionReview = function(question) {
                if ($scope.isMultipartScoringQuestionView(question)) {
                    return $scope.focusOnTextboxEvent;
                }
                return true;
            };

            $scope.isMultipartScoringQuestionView = function(question) {
                return ($scope.manualScores.length > 1 || $scope.manualScores[0] && $scope.manualScores[0].length) &&
                question.manualScore && question.multipartScores !== null;
            };

            var getCurrentForm = function() {
                    if ($scope.openQuestion) {
                        return angular.element('#manualScoreForm' + $scope.openQuestion.index).scope().manualScoreForm;
                    } else {
                        return null;
                    }
                },

                resetCurrentForm = function() {
                    if (getCurrentForm() && !getCurrentForm().$pristine) {
                        $scope.openQuestion.points = $scope.openQuestion._points;
                        getCurrentForm().$setPristine();
                    }
                },

                unsavedChangesModal = new UnsavedChangesModal(function() {
                    if ($scope.openQuestion.multipartScores && $scope.openQuestion.multipartScores !== null) {
                        return $scope.submitMultipartForm($scope.openQuestion, true);
                    }
                    return $scope.submitForm($scope.openQuestion, true);
                }),

                checkUnsavedChanges = function(currentAction, event) {
                    var isGoodToGo = !getCurrentForm() || getCurrentForm().$pristine;

                    if (isGoodToGo) {
                        resetRubricPanel();
                        if (!angular.isFunction(currentAction)) {
                            $log.error('AssignmentManualScoreTestCtrl: checkUnsavedChanges has invalid argument');
                            return;
                        }
                        return currentAction();

                    } else {
                        unsavedChangesModal.showDialog(event).then(currentAction, $scope.pageLoaded);
                    }
                },

                initializeTotalScore = function(question) {
                    if (question.points === null || question.points === 0) {
                        if (question.autoScore && question.autoScore !== null) {
                            question.pointsValue = question.autoScore;
                        } else {
                            question.pointsValue = 0;
                        }
                    } else {
                        question.pointsValue = question.points;
                    }
                },

                /*jshint loopfunc: true */
                initQuestions = function(assessmentResult) {
                    $scope.questions = assessmentResult.questionScores;
                    $scope.displayScore = assessmentResult.totalScore.percentScore;

                    var nextManual, i, question;
                    $scope.manualScores = [];
                    $scope.isManualScoreFormStartSaving = [];
                    $scope.isMultipartScoringQuestion = false;
                    for (i = $scope.questions.length - 1; i >= 0; i--) {
                        question = $scope.questions[i];
                        question.index = i;
                        question.previouslyScored = question.points !== null;
                        question._points = question.points; //On discard, we restore this score
                        if (question.multipartScores && question.multipartScores !== null) {
                            $scope.isMultipartScoringQuestion = true;
                            question.multipartScores = question.multipartScores;
                            initializeTotalScore(question);
                            question.maxPointsValue = question.maxPoints;
                            $scope.manualScores[i] = question.multipartScores.map(function(current) {
                                return {
                                    onFocus: false,
                                    points: !question.previouslyScored && !current.score.points ? null :
                                        current.score.points,
                                    maxPoints: current.score.maxPoints,
                                    responseIdentifiers: current.responseIdentifiers,
                                };
                            });
                            $scope.isManualScoreFormStartSaving[i] = false;
                        }

                        if (question.manualScore) {
                            question.nextManual = nextManual;
                            nextManual = i;
                        }
                    }
                },
                testProviderInitListener = function(event) {
                    if (event.data.init) {
                        event.source.isManualScore = true;
                    }
                };

            initQuestions($scope.assessmentResult);

            $window.addEventListener('message', testProviderInitListener);
            $scope.$on('$destroy', function() {
                $window.removeEventListener('message', testProviderInitListener);
            });

            $scope.questionCounts = $scope.questions.length;
            $scope.manualQuestionCounts = _.filter($scope.questions, function(question) {
                return question.manualScore;
            }).length;

            $scope.isAllManualScoreQuestions = $scope.questionCounts === $scope.manualQuestionCounts;

            $scope.expand = function(question, questionIndex) {
                var expandQuestion = function() {
                    resetCurrentForm();
                    var index = question.index; //Using index to track because question list is updated on save
                    $scope.openQuestion = (!$scope.openQuestion || $scope.openQuestion.index !== index) ?
                        $scope.questions[index] : null;
                    unsavedChangesModal.reset();
                    //highlight the first writing question in the iframe and also highlight the first manual score box
                    if ($scope.openQuestion && $scope.isMultipartScoringQuestionView(question)) {
                        $timeout(function() {
                            var mutilScoreBoxSelector = '.expanderRow:nth-child(' + (questionIndex + 1) +
                            ') .multi-manual-score-large:nth-child(1) input:nth-child(1)';
                            $(mutilScoreBoxSelector)[0].focus();
                        });
                    }
                };
                checkUnsavedChanges(expandQuestion);
            };

            var resetRubricPanel = function() {
                $scope.rubricGuid = undefined;
                $scope.isRubricAvailable = false;
                $scope.openRubricPanel = false;
            };

            $scope.rubricManualScore = function(rubricScore) {
                $scope.openQuestion.points = rubricScore;
                var currentForm =
                    angular.element('#manualScoreForm' + $scope.openQuestion.index).scope().manualScoreForm;
                currentForm.$pristine = false;
            };

            $scope.$on('assessment-player.questionReview.rubricGuid', function(evt, data) {
                if (data.rubricGuid) {
                    $scope.rubricGuid = data.rubricGuid;
                    $scope.isRubricAvailable = true;
                } else {
                    $scope.rubricGuid = undefined;
                    $scope.isRubricAvailable = false;
                }
            });

            $scope.closeSidebar = function() {
                $scope.openRubricPanel = false;
                setTimeout(function() {
                    var element = document.getElementById('rubric-test-nav-button');
                    if (element) {
                        element.focus();
                    }
                }, 100);
            };

            $scope.isRubricAvailableForAssignment = function() {
                return $scope.isRubricAvailable && $scope.assignment.useRubric;
            };

            $scope.toggleRubricPanel = function() {
                $scope.openRubricPanel = !$scope.openRubricPanel;
                if ($scope.openRubricPanel) {
                    setTimeout(function() {
                        var element = document.getElementById('rubricCloseButton');
                        var zeroStateRubricElement = document.getElementById('noRubricCloseButton');
                        if (element) {
                            element.focus();
                        } else {
                            zeroStateRubricElement.focus();
                        }
                    }, 100);
                }
                $scope.programTitle = telemetryUtilitiesService
                    .getProgramTitle($scope.assignment.programHierarchy);
                rubricEventTracking.clickOnRubricInManualScoreTestViewer($scope.programTitle,
                    $scope.assignment.contentItem.externalId, $scope.assignment.contentItem.title);
            };

            //Tab control
            $scope.activeTab = 'manual';
            $scope.tabFilter = {manualScore: true};

            $scope.showTab = function(tab) {
                if ($scope.activeTab !== tab) {
                    var openNewTab = function() {
                        resetCurrentForm();
                        $scope.activeTab = tab;
                        $scope.openQuestion = null;
                        if ($scope.activeTab === 'manual') {
                            $scope.tabFilter = {manualScore: true};
                        } else {
                            $scope.tabFilter = {};
                        }
                        unsavedChangesModal.reset();
                    };
                    checkUnsavedChanges(openNewTab);
                }
            };

            $scope.allScored = function() {
                return !$scope.assessmentResult.needsManualScoring;
            };

            //Build list of completed student
            if ($scope.assignment.$isLesson()) {
                //These are the lesson metadata, need to find the assessment
                _.each(ClassAndAssignmentData.completedList, function(student) {
                    var studentAssessment = $scope.assignment.$findItemMetadata(
                        $routeParams.itemId, student.studentUuid
                    );
                    if (studentAssessment && studentAssessment.status === 'completed') {
                        studentAssessment.studentInfo = student.studentInfo;
                        $scope.completedStudentList.push(studentAssessment);
                    }
                });
            } else {
                $scope.completedStudentList = ClassAndAssignmentData.completedList;
            }
            $scope.completedStudentList = _.sortBy($scope.completedStudentList, function(student) {
                return student.studentInfo.lastFirst;
            });

            //Find current student
            _.each($scope.completedStudentList, function(student, index) {
                if (student.userAssignmentId === $routeParams.userAssignmentId) {
                    $scope.student = student;
                    $scope.studentIndex = index;
                }
            });
            if (!$scope.student) {
                $log.error('Cannot find matching student with userAssignmentId', $routeParams.userAssignmentId);
            }

            // Navigation
            $scope.back = function() {
                if (!!$scope.backUrl) {
                    webStorage.add('lastUpdatedUserAssignmentId', $routeParams.userAssignmentId);
                    var url = urlUtilService.replacePathVariable(
                        $scope.backUrl, 'userAssignments', $routeParams.userAssignmentId);
                    NavigationService.navigate(url);
                } else {
                    var navigationFallback = $location.path().split('/manualScore')[0] + '/allstudents';
                    $scope.goBack(navigationFallback);
                }
            };

            $scope.changeStudent = function(offset, $event) {
                $event.preventDefault();
                var nextStudent = $scope.completedStudentList[$scope.studentIndex + offset],
                    next = [$location.path().split('/student')[0], 'student', nextStudent.studentUuid,
                        'userAssignmentId', nextStudent.userAssignmentId
                    ].join('/');
                $location.path(next);
            };

            $scope.reviewManualScore = function($event) {
                $event.preventDefault();
                var next = [$location.path().split('/manualScore')[0], 'manualScoreReview'].join('/');
                $location.path(next);
            };

            $scope.openNextQuestion = function(currentQuestion) {
                $scope.openQuestion = null; //Clear to avoid alert

                if ($scope.activeTab === 'all') {
                    var nextIndex = currentQuestion.index + 1;
                    if (nextIndex <= $scope.questionCounts - 1) {
                        $scope.expand($scope.questions[nextIndex]);
                    }
                } else {
                    if (currentQuestion.nextManual) {
                        $scope.expand($scope.questions[currentQuestion.nextManual]);
                    }
                }
            };

            $scope.reloadResult = function() {
                return Assessment.getResult($scope.assessmentSessionId).then(function(newResult) {
                    $scope.assessmentResult = newResult;
                    initQuestions(newResult);
                });
            };

            $scope.isInvalid = function($index) {
                var currentForm = angular
                   .element('#manualScoreForm' + $scope.openQuestion.index)
                   .scope()
                   .manualScoreForm;
                var manualInput = currentForm['input' + $index];
                return manualInput.$dirty && manualInput.$invalid;
            };

            $scope.disableMultiScoreSubmitButton = function(manualScoreForm, questionLength) {
                var invalid = false;
                for (var i = 0; i < questionLength; i++) {
                    var inputField = manualScoreForm['input' + i ];
                    if (inputField) {
                        invalid =
                        invalid || inputField.$dirty && (inputField.$invalid || inputField.$modelValue === null);
                    }
                }
                return invalid && manualScoreForm.$dirty || manualScoreForm.$pristine;
            };

            // Save score
            $scope.submitForm = function(question, skipAutoForward) {
                if (!!$scope.backUrl) {
                    webStorage.add('lastUpdatedUserAssignmentId', $routeParams.userAssignmentId);
                }
                return Assessment.saveManualScore($scope.assessmentSessionId, question.questionId, question.points)
                    .then(function() {
                    //TODO: what to do with error function/check result for false
                    return $scope.reloadResult().then(function() {

                        InlineAlertService.addAlert(
                            question.questionId,
                            {
                                type: 'success',
                                msg: lwcI18nFilter('manualScoreTest.saveSuccess')
                            }
                        );
                        getCurrentForm().$setPristine();
                        if (!skipAutoForward) {
                            $scope.openNextQuestion(question);
                        } else {
                            $scope.openQuestion = null; //Clear alert
                        }
                    });
                });
            };

            //Save multipart score
            $scope.submitMultipartForm = function(question, skipAutoForward) {
                var manualScoreArray = [];
                manualScoreArray = $scope.manualScores[question.index].map(function(manualScore) {
                    var points = manualScore.points;
                    // cannot check for isTruthy becoz points can be zero
                    if (points === null) {
                        return {
                            score: null
                        };
                    }
                    return {
                        score: {
                            points: points,
                            maxPoints: manualScore.maxPoints
                        },
                        responseIdentifiers: manualScore.responseIdentifiers
                    };
                });
                $scope.isManualScoreFormStartSaving[question.index] = true;
                return Assessment
                    .saveManualMultipartScore($scope.assessmentSessionId, question.questionId, manualScoreArray)
                    .then(function() {
                    //TODO: what to do with error function/check result for false
                    return $scope.reloadResult().then(function() {
                        InlineAlertService.addAlert(
                            question.questionId,
                            {
                                type: 'success',
                                msg: lwcI18nFilter('manualScoreTest.saveSuccess')
                            }
                        );
                        if (!skipAutoForward) {
                            $scope.openNextQuestion(question);
                        } else {
                            $scope.openQuestion = null; //Clear alert
                        }
                        $scope.isManualScoreFormStartSaving[question.index] = false;
                    });
                });
            };

            // TODO: Look into using the input element native ability to submit a form with enter key
            $scope.submitOnEnter = function(question, $event) {
                $event.stopPropagation();
                var currentForm = angular.element('#manualScoreForm' +
                    $scope.openQuestion.index).scope().manualScoreForm;
                //Workaround for ng-form input[type=number] bug, angularjs 1.3.0+ fixes this
                currentForm.input.$dirty = true;

                var formIsValid = !currentForm.$pristine && !currentForm.$invalid;

                if ($event.which === KEY_CODES.ENTER && formIsValid) {
                    $scope.submitForm(question);
                }
            };

            $scope.$on('$locationChangeStart', function(event) {
                checkUnsavedChanges(null, event);
            });

            $scope.updateScores = function(questionIndex) {
                var totalScore = 0,
                    autoScoreForCurrentQuestion = $scope.questions[questionIndex].autoScore;

                $scope.manualScores[questionIndex].forEach(function(manualScore) {
                    totalScore += manualScore.points || 0;
                    manualScore.onFocus = false;
                });

                if (autoScoreForCurrentQuestion && autoScoreForCurrentQuestion !== null) {
                    $scope.questions[questionIndex].pointsValue = autoScoreForCurrentQuestion +
                        Math.round(totalScore * 100) / 100;
                } else {
                    $scope.questions[questionIndex].pointsValue = Math.round(totalScore * 100) / 100;
                }

                $scope.focusOnTextboxEvent = {
                    type: 'unfocus',
                    textBoxToQuestionMappingId: ''
                };
            };
        }
    ]);
