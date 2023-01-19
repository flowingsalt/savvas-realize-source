angular.module('RealizeApp')
    .factory('Resolve', [
        'Content',
        'Assessment',
        'ClassRoster',
        'Group',
        'User',
        'AssignmentFacadeService',
        'AssignmentViewOptions',
        'MyContent',
        '$q',
        '$rootScope',
        '$log',
        '$route',
        'AssessmentPlayerService',
        'ReportService',
        'DISTANT_FUTURE_DATE',
        'ProgramsLandingService',
        '$location',
        'NavigationService',
        'ContentSource',
        'CalendarService',
        'CLASS_ROSTER_THEMES',
        '$http',
        'PATH',
        'googleClassroomService',
        'featureManagementService',
        'CONTRIBUTOR_SOURCE',
        'AssignmentUtil',
        'locationUtilService',
        function(Content, Assessment, ClassRoster, Group, User, AssignmentFacadeService, AssignmentViewOptions,
            MyContent, $q, $rootScope, $log, $route, AssessmentPlayerService, ReportService, DISTANT_FUTURE_DATE,
            ProgramsLandingService, $location, NavigationService, ContentSource, CalendarService, CLASS_ROSTER_THEMES,
            $http, PATH, googleClassroomService, featureManagementService, CONTRIBUTOR_SOURCE, AssignmentUtil,
            locationUtilService) {
            'use strict';

            // placed up here because it's being reused by Remediation
            var contentResolver = function() {
                var deferred = $q.defer(),
                    jobD = $q.defer(),
                    tasks = {
                        program: false,
                        tier: false,
                        lesson: false,
                        content: false
                    },
                    tasksComplete = function() {
                        return tasks.program !== false && tasks.tier !== false && tasks.lesson !== false &&
                            tasks.content !== false;
                    };

                jobD.promise.then(function() {
                    $log.log('content resolve jobs done', tasks);

                    // now we have to find the appropriate parent for this item (titleInSequence...bleh)
                    var pContent = null;

                    // lesson is lowest possible parent other than direct
                    if (tasks.lesson !== 'na') {
                        if (tasks.lesson && tasks.lesson.playerTarget === 'realize-presenter') {
                            var items = _.map(tasks.lesson.contentItems, function(item) {
                                if (item.mediaType === 'Learning Model') {
                                    return item.contentItems;
                                }
                                return item;
                            });
                            tasks.content.siblings = _.flatten(items);
                        }

                        pContent = $.Enumerable.From(tasks.lesson.contentItems)
                            .Where('$.id == \'' + tasks.content.id + '\'')
                            .FirstOrDefault(null);
                        // a lesson can have content on the top, as well as learning model buckets, keep searching...
                        if (pContent === null) {
                            $.Enumerable.From(tasks.lesson.contentItems)
                                .Where('$.mediaType == \'Learning Model\'')
                                .ForEach(function(learningModel) {
                                    pContent = $.Enumerable.From(learningModel.contentItems)
                                        .Where('$.id == \'' + tasks.content.id + '\'')
                                        .FirstOrDefault(null);
                                    // todo: break out if found?
                                });
                        }
                    } else if (tasks.tier !== 'na') {
                        pContent = $.Enumerable.From(tasks.tier.contentItems)
                            .Where('$.id == \'' + tasks.content.id + '\'')
                            .FirstOrDefault(null);
                    } else if (tasks.program !== 'na') {
                        pContent = $.Enumerable.From(tasks.program.contentItems)
                            .Where('$.id == \'' + tasks.content.id + '\'')
                            .FirstOrDefault(null);
                    }

                    // TODO: when an asset has been loaded from a Teacher Support bucket (remediation?) we don't
                    //    have any support for that at all

                    if (pContent !== null) {
                        tasks.content.associativeProps = angular.copy(pContent.associativeProps);
                    }

                    deferred.resolve(tasks.content);
                });

                function setTasksProgramAndFinish(program) {
                    tasks.program = program;
                    if (tasksComplete()) {
                        jobD.resolve();
                    }
                }
                // lesson or tier will be lower than program always
                if ($route.current.params.programId && !$route.current.params.lessonId &&
                    !$route.current.params.tierId) {
                    // make sure we have program loaded then
                    if ($route.current.params.programId && $rootScope.currentProgram &&
                        $rootScope.currentProgram.id === $route.current.params.programId &&
                        $rootScope.currentProgram.version === $route.current.params.programVersion) {
                        // use current program
                        setTasksProgramAndFinish($rootScope.currentProgram);
                    } else {
                        // load program from route
                        Content.get({
                                contentId: $route.current.params.programId,
                                version: $route.current.params.programVersion
                            })
                            .then(function(programItem) {
                                $rootScope.currentProgram = programItem;
                                setTasksProgramAndFinish(programItem);
                            });
                    }
                } else {
                    // we dont have a program involved (direct content)
                    setTasksProgramAndFinish('na');
                }

                // lesson is always the last possible parent
                if ($route.current.params.tierId && !$route.current.params.lessonId) {
                    // todo: store in $rootScope for reference?
                    Content.get({
                            contentId: $route.current.params.tierId,
                            version: $route.current.params.tierVersion
                        })
                        .then(function(tierItem) {
                            tasks.tier = tierItem;
                            if (tasksComplete()) {
                                jobD.resolve();
                            }
                        });
                } else {
                    tasks.tier = 'na';
                    if (tasksComplete()) {
                        jobD.resolve();
                    }
                }

                if ($route.current.params.lessonId) {
                    // todo: store in $rootScope for reference?
                    Content.get({
                            contentId: $route.current.params.lessonId,
                            version: $route.current.params.lessonVersion,
                            levels: 3
                        })
                        .then(function(lessonItem) {
                            tasks.lesson = lessonItem;
                            if (tasksComplete()) {
                                jobD.resolve();
                            }
                        });
                } else {
                    tasks.lesson = 'na';
                    if (tasksComplete()) {
                        jobD.resolve();
                    }
                }

                var contentSource = ContentSource.getByPath(),
                    brokenContent = new Content({
                        broken: true,
                        mediaType: 'broken'
                    });

                function setTasksContentAndFinish(contentItem) {
                    tasks.content = contentItem;
                    if (tasksComplete()) {
                        jobD.resolve();
                    }
                }

                // levels changed from 2 to 1 to improve performance.
                // If you need to change to levels = 3, please discuss with the team first.
                contentSource.get({
                        contentId: $route.current.params.itemId,
                        version: $route.current.params.itemVersion,
                        levels: 1
                    })
                    .then(
                        function(contentItem) {
                            if (featureManagementService.isAssessmentMaintenancePageEnabled()) {
                                setTasksContentAndFinish(contentItem);
                                return deferred.promise;
                            }
                            if (!contentItem.isExternalResource() && contentItem.$isTestNavTest()) {
                                Assessment.getInfo(contentItem.id, contentItem.version).then(function(result) {
                                    if (result.externalProps) {
                                        contentItem.qtiExternalProps = result.externalProps;
                                    }
                                    setTasksContentAndFinish(contentItem);
                                }, function(err) {
                                    $log.error('Failed to get assessment info', err);
                                    setTasksContentAndFinish(brokenContent);
                                });
                            } else if (angular.isFunction(contentItem.isLtiItem) && contentItem.isLtiItem()) {
                                var programId = $route.current.params.programId,
                                    programVersion = $route.current.params.programVersion,
                                    optionalParams = {};

                                //content could be launched from program TOC, or from class assignment, etc...
                                //have to check to parent program/version b/c of this
                                if (programId) {
                                    optionalParams.programId = programId;
                                }

                                if (programVersion) {
                                    optionalParams.programVersion = programVersion;
                                }

                                Content.getLtiLaunchInfo(contentItem.id, contentItem.version, optionalParams)
                                    .then(function(launchInfo) {
                                        contentItem.ltiLaunchSettings = launchInfo.settings;
                                        contentItem.ltiLaunchParams = launchInfo.launchParams;
                                        setTasksContentAndFinish(contentItem);
                                    })
                                    .catch(function(err) {
                                        $log.error('Failed to get LTI content item params', err);
                                        setTasksContentAndFinish(brokenContent);
                                    });
                            } else {
                                setTasksContentAndFinish(contentItem);
                            }
                        },
                        function(err) {
                            $log.error('Failed to retrieve item', err);
                            setTasksContentAndFinish(brokenContent);
                        }
                    );

                return deferred.promise;
            };

            var classRosterData = function() {
                // already cached by service no need for currentRoster, phasing out
                return ClassRoster.get($route.current.params.classId)
                    .then(function(roster) {
                        roster.learningExperience = roster.learningExperience || CLASS_ROSTER_THEMES[0].name;
                        $rootScope.currentRoster = roster;
                        return roster;
                    }, function() {
                        return $q.reject('error getting roster! ' + $route.current.params.classId);
                    });
            };

            //TODO: Move to service since it is reused in many routes
            var programResolve = function(isEditProgram) {
                var deferred = $q.defer();

                if ($rootScope.currentProgram && $rootScope.currentProgram.id === $route.current.params.programId &&
                    $rootScope.currentProgram.version === $route.current.params.programVersion) {
                    deferred.resolve($rootScope.currentProgram);
                } else {
                    var getProgramSuccess = function(program) {
                            $rootScope.currentProgram = program;

                            // Load Teacher support
                            var promises = {},
                                itemToOpen = $location.search().forceOriginalView === 'true' ?
                                program : program.$getDefaultVersion();

                            if (program.$hasAssociatedItem('Teacher Support')) {
                                var supportQuery = {
                                    contentId: program.associatedTeacherSupport.id,
                                    version: program.associatedTeacherSupport.version
                                };

                                promises.teacherSupport = Content.get(supportQuery).then(function(response) {
                                    itemToOpen.associatedTeacherSupport = response;
                                    return response;
                                });
                            }
                            promises.essayPrompt = ProgramsLandingService.getEssayPromptAccess(itemToOpen).then(
                                function(access) {
                                    itemToOpen.hasEssayPromptAccess = access;
                                    $rootScope.currentProgram.hasEssayPromptAccess = access;
                                    return access;
                                }
                            );

                            $q.all(promises).then(
                                function() {
                                    deferred.resolve(itemToOpen);
                                },
                                function(err) {
                                    $log.error('Failed to load teacher support', err);
                                    deferred.resolve(itemToOpen);
                                }
                            );

                        },
                        getProgramError = function(err) {
                            deferred.reject(err);
                        };
                    // avoiding content call when program id or program version not available
                    if (!$route.current.params.programId || !$route.current.params.programVersion) {
                        return deferred.resolve();
                    }
                    if (isEditProgram) {
                        Content.getWithoutInsertingCustomized({
                            contentId: $route.current.params.programId,
                            version: $route.current.params.programVersion,
                            levels: 1
                        }).then(getProgramSuccess, getProgramError);
                    } else {
                        Content.get({
                            contentId: $route.current.params.programId,
                            version: $route.current.params.programVersion,
                            levels: 1
                        }).then(getProgramSuccess, getProgramError);
                    }
                }

                return deferred.promise;
            };

            return {
                ProgramListInfo: ProgramsLandingService.getProgramListInfo,
                Program: programResolve,
                eText: function() {
                    var deferred = $q.defer();

                    programResolve().then(function(program) {
                        if (program.library && program.library.length > 0) {
                            Content.queryFast({
                                LIBRARY_TITLE: program.library[0],
                                MEDIA_TYPE: 'eText',
                                filterBySubscriptions: true,
                                NOT_ITEM_STATUS: ['deleted', 'archived']
                            }, function(etexts) {
                                deferred.resolve(etexts);
                            }, function(err) {
                                deferred.reject(err);
                            });
                        } else {
                            deferred.resolve([]);
                        }
                    }, function(err) {
                        deferred.reject(err);
                    });

                    return deferred.promise;
                },
                ClassRoster: function() {
                    return classRosterData();
                },
                ClassRosters: function() {
                    return ClassRoster.get().then(function(rosters) {
                        rosters.learningExperience = rosters.learningExperience || CLASS_ROSTER_THEMES[0].name;
                        return rosters;
                    }, function() {
                        return $q.reject('error getting rosters!');
                    });
                },
                AssignmentErrorData: function() {
                    // TODO : This query needs to be changed after the endpoint is ready for this
                    var transactionQuery = googleClassroomService
                        .getClassSyncQueryForClassAssignment($route.current.params.classId,
                        $route.current.params.assignmentId);
                    return classRosterData().then(function(rosters) {
                        return rosters.isGoogleClass();
                    }).then(function(isGoogleClass) {
                        if (isGoogleClass && featureManagementService.isGoogleClassroomEnabled() &&
                            !(featureManagementService.isExternalAssignmentDetailsLevelTwoEnabled() &&
                            locationUtilService.isAllStudentsPage())) {
                            return googleClassroomService.classSyncServiceQuery(transactionQuery)
                                .then(function(successResponse) {
                                    return successResponse;
                                })
                                .catch(function(errorResponse) {
                                    return errorResponse;
                                });
                        }
                    });
                },
                GroupList: function() {
                    var deferred = $q.defer();

                    Group.getAll().then(function(result) {
                        deferred.resolve(result);
                    });

                    return deferred.promise;
                },
                TeacherAssignmentsByClass: function() {
                    var deferred = $q.defer();

                    AssignmentFacadeService.getAssignmentsCountByClass($route.current.params.classId)
                        .then(function(result) {
                            var resolveObj = {};
                            resolveObj.assignmentsCount = result;
                            if (resolveObj.assignmentsCount.totalActive === 0) {
                                // No active assignments, no need to make second call
                                angular.extend(resolveObj, {
                                    assignments: [],
                                    gradeTypes: [],
                                    viewTypes: []
                                });
                                deferred.resolve(resolveObj);
                            } else {
                                var filters = AssignmentViewOptions.getDefaultFilter($route.current.params.classId);
                                filters.page = AssignmentUtil.getPageNumber(
                                    $route.current.params.classId, filters.assignmentStatus);
                                AssignmentFacadeService.getAssignmentsByClass($route.current.params.classId, filters)
                                    .then(
                                        function(result) {
                                            angular.extend(resolveObj, {
                                                assignments: result.assignments,
                                                totalMatched: result.numberOfAssignments,
                                                gradeTypes: result.gradeTypes,
                                                viewTypes: result.viewTypes,
                                                page: result.page
                                            });
                                            deferred.resolve(resolveObj);
                                        },
                                        function(err) {
                                            deferred.reject(err);
                                        }
                                    );
                            }
                        });
                    return deferred.promise;
                },
                TeacherSingleAssignment: function() {
                    var prepareStudentList = function(resolveObj, students) {
                        var studentList = resolveObj.assignment.getFilteredStudentList(students);

                        resolveObj.notStartedList = studentList.notStarted;
                        resolveObj.inProgressList = studentList.inProgress;
                        resolveObj.completedList = studentList.completed;

                        return resolveObj;
                    };

                    var promise = $q.all([
                            this.ClassRoster(),
                            AssignmentFacadeService.get(
                                $route.current.params.classId, $route.current.params.assignmentId
                            )
                        ])
                        .then(function(response) {
                            var resolveObj = {};
                            resolveObj.roster = response[0];
                            resolveObj.assignment = response[1];

                            var filteredStudentMetadata = resolveObj.assignment.studentMetadata;
                            if (resolveObj.assignment.contentItem.$isLesson()) {
                                resolveObj.assignment.childContents = resolveObj.assignment.$getLessonItems();
                                //Only want lesson metadata if it is a lesson
                                filteredStudentMetadata = _.where(
                                    resolveObj.assignment.studentMetadata, {
                                        itemType: 'Sequence',
                                        assignmentId: resolveObj.assignment.assignmentId
                                    }
                                );
                            }

                            if (resolveObj.assignment.contentItem.isRRS()) {
                                //Only want RRS metadata if it is a RRS and it has SCO activities
                                filteredStudentMetadata = _.where(
                                    resolveObj.assignment.studentMetadata, {
                                        itemType: 'Realize Reader Selection',
                                        assignmentId: resolveObj.assignment.assignmentId
                                    }
                                );
                            }

                            var studentMetadataIsCompleted = [];

                            // Fill in student info now
                            angular.forEach(filteredStudentMetadata, function(metadata) {
                                var user = _.findWhere(resolveObj.roster.students, {
                                    userId: metadata.studentUuid
                                });
                                if (!user) {
                                    // Try finding the user directly from RUMBA in case the STUDENT is removed from
                                    //    the class.
                                    var rumbaUserPromise = User.getUserById(metadata.studentUuid)
                                        .then(function(rumbaUser) {
                                            metadata.studentInfo = rumbaUser;
                                            if (!rumbaUser) {
                                                $log.error('Cannot find matching student: ',
                                                    metadata);
                                                return;
                                            }
                                        });

                                    studentMetadataIsCompleted.push(rumbaUserPromise);
                                } else {
                                    metadata.studentInfo = user;
                                }

                                if (metadata.attachmentUrl) {
                                    metadata.attachmentObj =
                                        resolveObj.assignment.$getUserAttachment(metadata.attachmentUrl);
                                }

                                metadata.$isLate = function() {
                                    return resolveObj.assignment.$isLate(this);
                                };
                            });

                            return $q.all(studentMetadataIsCompleted).then(function() {
                                return prepareStudentList(resolveObj, filteredStudentMetadata);
                            }, function(error) {
                                $log.error('Failed to retrieve missing students:', error);
                                //Let it through so user can view status of other students
                                return prepareStudentList(resolveObj, filteredStudentMetadata);
                            });
                        });
                    return promise;
                },
                StudentAssignmentsByStatus: function(status) {
                    var classId = $route.current.params.classId,
                        studentId = $rootScope.currentUser.userId,
                        filters = AssignmentViewOptions.getStudentFilterByStatus(status);

                    filters.includeCounts = true;

                    return AssignmentFacadeService.getStudentAssignmentsByStatus(classId, studentId, status,
                        filters);
                },
                StudentAssignmentsCount: function() {
                    var classId = $route.current.params.classId,
                        studentId = $rootScope.currentUser.userId;

                    return AssignmentFacadeService.getStudentAssignmentsCount(classId, studentId);
                },
                StudentAssignmentsByClass: function() {
                    return AssignmentFacadeService.getAssignmentsByClass($route.current.params.classId);
                },
                StudentSingleAssignment: function() {
                    return AssignmentFacadeService.get(
                        $route.current.params.classId, $route.current.params.assignmentId
                    );
                },
                SingleLWCAssignment: function() {
                    return AssignmentFacadeService.getLWCAssignment(
                        $route.current.params.classId, $route.current.params.assignmentId
                    );
                },
                TeacherAssignmentData: function() {
                    return AssignmentFacadeService.get(
                        $route.current.params.classId, $route.current.params.assignmentId
                    );
                },
                Lesson: function(isEditLesson) {
                    var deferred = $q.defer(),
                        jobD = $q.defer(),
                        tasks = { // create a job list object to track multiple async operations
                            lesson: false,
                            tier: false,
                            program: false
                        };

                    if (!isEditLesson && locationUtilService.isTOCActive() &&
                            featureManagementService.isExternalTOCViewerEnabled()) {
                        if ($rootScope.currentProgram &&
                            $rootScope.currentProgram.id === $route.current.params.programId &&
                            $rootScope.currentProgram.version === parseInt($route.current.params.programVersion)) {
                            deferred.resolve();
                        } else {
                            Content.get({
                                contentId: $route.current.params.programId,
                                version: $route.current.params.programVersion
                            }).then(function(programItem) {
                                $rootScope.currentProgram = programItem;
                                deferred.resolve();
                            }).catch(function(error) {
                                $log.error('error fetching program item: ', error);
                                deferred.reject();
                            });
                        }
                        return deferred.promise;
                    }

                    jobD.promise.then(function() {
                        // get the lesson data from the parent sequence
                        var pLesson;

                        if (tasks.program !== 'na' && tasks.tier !== 'na') {
                            // if we have both, then the tier holds the key
                            pLesson = $.Enumerable.From(tasks.tier.contentItems)
                                .Where('$.id == \'' + tasks.lesson.id + '\'')
                                .FirstOrDefault(null);
                        } else if (tasks.program !== 'na') {
                            // if we just have program then it has the info
                            pLesson = $.Enumerable.From(tasks.program.contentItems)
                                .Where('$.id == \'' + tasks.lesson.id + '\'')
                                .FirstOrDefault(null);
                        }

                        // if we dont have a parent lesson at this point, it's direct
                        if (pLesson) {
                            // combine the parent's data with the loaded data (for now just associativeProps,
                            //    need more?)
                            tasks.lesson.associativeProps = angular.copy(pLesson.associativeProps);
                        }

                        // resolve the main tier data
                        deferred.resolve(tasks.lesson);
                    });

                    if (!angular.isDefined($route.current.params.programId)) {
                        // we are doing a direct lesson
                        tasks.program = 'na';
                        tasks.tier = 'na';
                    } else {
                        // we are doing some combo of program & tier
                        if (angular.isDefined($route.current.params.tierId)) {
                            // get tier
                            Content.get({
                                    contentId: $route.current.params.tierId,
                                    version: $route.current.params.tierVersion
                                })
                                .then(function(tierItem) {
                                    tasks.tier = tierItem;
                                    // TODO: store this in $rootScope? might not need it...
                                    // TODO: cache
                                    if (tasks.program !== false && tasks.lesson !== false) {
                                        jobD.resolve();
                                    }
                                });
                        } else {
                            // it's possible to go program->lesson
                            tasks.tier = 'na';
                        }

                        // make sure we have program
                        if ($route.current.params.programId && $rootScope.currentProgram &&
                            $rootScope.currentProgram.id === $route.current.params.programId &&
                            $rootScope.currentProgram.version === $route.current.params.programVersion) {
                            // use current program
                            tasks.program = $rootScope.currentProgram;
                            if (tasks.tier !== false && tasks.lesson !== false) {
                                jobD.resolve();
                            }
                        } else {
                            // load program from route
                            Content.get({
                                    contentId: $route.current.params.programId,
                                    version: $route.current.params.programVersion
                                })
                                .then(function(programItem) {
                                    tasks.program = $rootScope.currentProgram = programItem;
                                    if (tasks.tier !== false && tasks.lesson !== false) {
                                        jobD.resolve();
                                    }
                                });
                        }
                    }

                    // todo: make this whole method better async
                    var lessonId = '';
                    var lessonVersion = '';

                    //hack-y.. handles case where param names are lessonId and lessonVersion
                    if ($route.current.params.itemId && $route.current.params.itemVersion) {
                        lessonId = $route.current.params.itemId;
                        lessonVersion = $route.current.params.itemVersion;
                    } else if ($route.current.params.lessonId && $route.current.params.lessonVersion) {
                        lessonId = $route.current.params.lessonId;
                        lessonVersion = $route.current.params.lessonVersion;
                    } else {
                        jobD.reject('unexpected lesson param name');
                    }

                    if (isEditLesson) {
                        Content.getWithoutInsertingCustomized({
                                contentId: lessonId,
                                version: lessonVersion,
                                levels: 3
                            })
                            .then(function(lessonItem) {
                                tasks.lesson = lessonItem;
                                if (tasks.program !== false && tasks.tier !== false) {
                                    jobD.resolve();
                                }
                            });
                    } else {
                        // no matter what we want a lesson here, need 3 levels cuz of the inner nesting they do
                        Content.get({
                                contentId: lessonId,
                                version: lessonVersion,
                                levels: 3
                            })
                            .then(function(lessonItem) {
                                tasks.lesson = lessonItem;
                                if (tasks.program !== false && tasks.tier !== false) {
                                    jobD.resolve();
                                }
                            });
                    }

                    return deferred.promise;
                },
                Content: contentResolver,
                MyContent: function() {
                    var deferred = $q.defer();

                    programResolve().then(function(program) {
                        var containerIdPromise = MyContent.buildStringOriginalIdCustomizedIdForItem(
                            program);

                        containerIdPromise
                            .then(function(containerId) {
                                MyContent.get({
                                        containerId: containerId,
                                        useSearch: false
                                    })
                                    .then(function(response) {
                                        var results = (response.results || []).map(function(
                                            result) {
                                            result = new Content(result);
                                            result.myContent = true;
                                            return result;
                                        });
                                        deferred.resolve(results);
                                    }, deferred.reject);
                            });
                    });

                    return deferred.promise;
                },
                AssessmentBuilder: function() {
                    return contentResolver().then(function(content) {
                        if (featureManagementService.isAssessmentMaintenancePageEnabled()) {
                            return;
                        }
                        var promise = $q.all([
                                Assessment.getInfo(content.id, content.version),
                                content.$getAssignedStatus(),
                                MyContent.getOriginalIdFromCustomized(content.id)
                            ])
                            .then(function(response) {
                                content.assessmentId = response[0].assessmentId;
                                content.active = response[0].active;
                                content.nativeAssessment = response[0].nativeAssessment;
                                content.assignedStatus = response[1];
                                content.originalItemId = response[2].originalItemId;
                                content.userCreated = false;
                                $log.log(
                                    'BuilderCtrl - Assessment loaded!',
                                    content.assessmentId, ': active = ',
                                    content.active
                                );
                                return content;
                            });
                        return promise;
                    });
                },
                CloneAssessmentIfNotFromMySource: function() {
                    return contentResolver().then(function(content) {
                        if (content.contribSource === CONTRIBUTOR_SOURCE.MY_UPLOADS) {
                            return $q.resolve();
                        }
                        return Assessment.createCustomizeVersion(content.id, content.version);
                    });
                },
                UserCreatedAssessment: function() {
                    var promise = this.AssessmentBuilder();
                    return promise.then(function(content) {
                        content.userCreated = true;
                        return content;
                    });
                },
                EssayPromptAssessment: function() {
                    return this.EssayPromptBuilder()
                        .then(function(content) {
                            content.isNewTest = false;
                            return content;
                        });
                },
                EssayPromptBuilder: function() {
                    return contentResolver().then(function(content) {
                        var promise = $q.all([
                                Assessment.getInfo(content.id, content.version),
                                MyContent.getOriginalIdFromCustomized(content.id)
                            ])
                            .then(function(response) {
                                content.assessmentId = response[0].assessmentId;
                                content.originalItemId = response[1].originalItemId;
                                return Assessment.loadAssessment(content.assessmentId, true);
                            });
                        return promise;
                    });
                },
                CreateAssessment: function() {
                    // make sure $rootScope.currentProgram is set...
                    return programResolve().then(function() {
                        return {
                            userCreated: true,
                            active: true,
                            inMyLibrary: true
                        };
                    });
                },
                Remediation: function() {
                    var defer = $q.defer(),
                        skillIds, isEnrichment,
                        isRemediation,
                        buildRemediationMap,
                        buildQuestionsMap;

                    isEnrichment = function(item) {
                        return item.remediationType && item.remediationType.toLowerCase() === 'enrichment';
                    };

                    isRemediation = function(item) {
                        return !isEnrichment(item);
                    };

                    function skillsLocaleDescription(skill, language) {
                        if ((skill['spanish description'] && skill['spanish description'] !== '') &&
                            (language === 'Spanish' ||
                                $rootScope.currentUser.getAttribute('profile.locale') === 'es')) {

                            skill.description = skill['spanish description'];
                        }
                    }

                    buildRemediationMap = function(content, skillDetail) {
                        var skillName, isSkillPresent = false;

                        content.remediationSkills = {};
                        angular.forEach(content.associatedRemediation.contentItems, function(item) {
                            if (isRemediation(item)) {
                                angular.forEach(item.skills, function(skill) {
                                    skillsLocaleDescription(skillDetail[skill], item.language);
                                    if (!content.remediationSkills[skill]) {
                                        isSkillPresent = true;
                                        skillName = (skillDetail && skillDetail[skill] &&
                                                skillDetail[skill].description) ?
                                            skillDetail[skill].description : skill;
                                        content.remediationSkills[skill] = {
                                            name: skill,
                                            description: skillName,
                                            items: []
                                        };
                                    }
                                    content.remediationSkills[skill].items.push(new Content(
                                        item));
                                });
                            }
                        });
                        if (isSkillPresent) {
                            // get the question to skill map only if there are skills associated to the content
                            return buildQuestionsMap(content);
                        }
                    };

                    function getQuestionsGroupedBySkills(assessmentId, content) {
                        // get the assessment object and pass it to next promise in chain
                        return Content.getAssessment(assessmentId)
                            .then(function(response) {
                                var assessment = response.data;
                                // first collect all the questions that have at least one skill
                                var questionSequence = $.Enumerable.From(assessment.questions)
                                    .Where('$.skillDetails && $.skillDetails.length > 0');
                                var filteredSkills = {};
                                angular.forEach(content.remediationSkills, function(skill, skillId) {
                                    var questionsHavingThisSkill = questionSequence
                                        // retrieve questions having skill referenced in current iterator
                                        .Where(function(question) {
                                            return $.Enumerable
                                                .From(question.skillDetails)
                                                .Where(function(skillDetail) {
                                                    // $log.log('skill id: ' + skillDetail.id);
                                                    return skillDetail.id === skill.name;
                                                })
                                                .Count() > 0;
                                        }).ToArray();
                                    skill.associatedQuestions = questionsHavingThisSkill;

                                    // filter out skills not associated to any question...
                                    if (questionsHavingThisSkill && questionsHavingThisSkill.length >
                                        0) {
                                        filteredSkills[skillId] = skill;
                                    }
                                });

                                // only include skills that actually have content...
                                content.remediationSkills = filteredSkills;

                                $log.debug('promise in getQuestionsGroupedBySkills');
                                return content;
                            });
                    }

                    // attach questions in the assessment that are associated with each of the skills in the
                    //   remediation viewer
                    buildQuestionsMap = function(content) {
                        return Assessment.getInfo(content.id, content.version)
                            .then(function(response) {
                                var assessmentId = response.assessmentId;
                                $log.debug('buildQuestionsMap: got assessment id ' + assessmentId);
                                return assessmentId; // pass assessment id to the next promise in chain
                            })
                            .then(function(assessmentId) {
                                // retrieve the assessment object using the id and map questions to skills
                                return getQuestionsGroupedBySkills(assessmentId, content);
                            });
                    };

                    Content.get({
                            contentId: $route.current.params.itemId,
                            version: $route.current.params.itemVersion,
                            levels: 2
                        })
                        .then(function(content) {
                            $log.debug('content resolver');
                            content.enrichment = [];
                            $.Enumerable.From(content.associatedRemediation.contentItems)
                                .Where(isEnrichment)
                                .Distinct()
                                .ForEach(function(item) {
                                    content.enrichment.push(new Content(item));
                                });

                            skillIds = $.Enumerable.From(content.associatedRemediation.contentItems)
                                .Where(isRemediation)
                                .SelectMany('$.skills')
                                .Distinct()
                                .ToArray();
                            return content; // pass 'content' to the next promise in chain
                        })
                        .then(
                            function(content) {
                                $log.debug('next promise after content resolver');
                                if (skillIds.length > 0) {
                                    Content.getSkillsById(skillIds)
                                        .then(function(response) {
                                            $log.debug('next promise after skills 1');
                                            return response.data;
                                            // pass the skills to the next promise
                                        })
                                        .then(function(skills) {
                                            $log.debug('next promise after skills 2');
                                            return buildRemediationMap(content, skills);
                                            //buildRemediationMap returns a promise if skills is not empty
                                        })
                                        .then(
                                            function() {
                                                $log.debug('next promise after buildRemediationMap with skills');
                                                defer.resolve(content);
                                                //load the UI after promise returned by buildRemediationMap has
                                                //    returned a value
                                            },
                                            function(err) {
                                                // this error handler will fire if any of the rest calls from
                                                //    Content.getSkillsById onwards fail
                                                $log.error('error handler in remediation viewer' + err);
                                                defer.resolve(content);
                                                // load the UI with whatever content is available
                                            }
                                        );
                                } else {
                                    buildRemediationMap(content, {});
                                    // this version of buildRemediationMap does not do any more async actions
                                    $log.debug('next promise after buildRemediationMap without skills');
                                    defer.resolve(content); // resolve  and load the UI
                                }
                            },
                            function(err) {
                                $log.error('error in getting remediation content ', err);
                                defer.reject({
                                    type: 'back',
                                    itemNotFound: true
                                });
                            }
                        );
                    return defer.promise;
                },
                Tier: function() {
                    var deferred = $q.defer(),
                        jobD = $q.defer(),
                        tasks = { // create a job list object to track multiple async operations
                            tier: false,
                            program: false
                        };

                    if (locationUtilService.isTOCActive() && featureManagementService.isExternalTOCViewerEnabled()) {
                        if ($rootScope.currentProgram &&
                            $rootScope.currentProgram.id === $route.current.params.programId &&
                            $rootScope.currentProgram.version === parseInt($route.current.params.programVersion)) {
                            deferred.resolve();
                        } else {
                            Content.get({
                                contentId: $route.current.params.programId,
                                version: $route.current.params.programVersion
                            }).then(function(programItem) {
                                $rootScope.currentProgram = programItem;
                                deferred.resolve();
                            }).catch(function(error) {
                                $log.error('error fetching program item: ', error);
                                deferred.reject();
                            });
                        }
                        return deferred.promise;
                    }

                    jobD.promise.then(function() {
                        $log.log('tier resolve jobs done', tasks);
                        // get the tier data from within the program
                        var pTier = $.Enumerable.From(tasks.program.contentItems)
                            .Where('$.id == \'' + tasks.tier.id + '\'')
                            .FirstOrDefault(null);

                        // combine the program data with the full tier data (for now just associativeProps, need more?)
                        if (pTier !== null) {
                            tasks.tier.associativeProps = angular.copy(pTier.associativeProps);
                        }

                        if (tasks.tier.$hasAssociatedItem('Teacher Support')) {
                            var teacherSupportRetrieved = tasks.tier.$setAssociatedItem(
                                'Teacher Support');

                            teacherSupportRetrieved.then(function() {
                                deferred.resolve(tasks.tier);
                            });

                        } else {
                            deferred.resolve(tasks.tier);
                        }

                    });

                    // get tier
                    // levels changed from 3 to 1 to improve performance.
                    // If you need to change to levels = 3, please discuss with the team first.
                    Content.get({
                            contentId: $route.current.params.itemId,
                            version: $route.current.params.itemVersion,
                            levels: 1
                        })
                        .then(function(tierItem) {
                            tasks.tier = tierItem;
                            if (tasks.program !== false) {
                                jobD.resolve();
                            }
                        });

                    // make sure we have program
                    if ($route.current.params.programId && $rootScope.currentProgram &&
                        $rootScope.currentProgram.id === $route.current.params.programId &&
                        $rootScope.currentProgram.version === parseInt($route.current.params.programVersion)) {
                        // use current program
                        tasks.program = $rootScope.currentProgram;
                        if (tasks.tier !== false) {
                            jobD.resolve();
                        }
                    } else {
                        // load program from route
                        Content.get({
                                contentId: $route.current.params.programId,
                                version: $route.current.params.programVersion
                            })
                            .then(function(programItem) {
                                tasks.program = $rootScope.currentProgram = programItem;
                                if (tasks.tier !== false) {
                                    jobD.resolve();
                                }
                            });
                    }

                    return deferred.promise;
                },
                StudentClasses: function() {
                    // for now just set studentId to true to get student rosters, as it only works for currently
                    //    logged in student
                    // for future when server is updated we will need a real ID
                    var deferred = $q.defer(),
                        done = AssignmentFacadeService.getClassesReportingData();

                    done.then(function(response) {
                        var rosters = [],
                            results = [];

                        rosters = response;
                        $.Enumerable.From(rosters).OrderBy('$.reportingData.nextAssignmentDueDate')
                            .ForEach(function(roster) {
                                if (roster.reportingData.nextAssignmentDueDate) {
                                    roster.minAssignment = roster.reportingData.nextAssignmentDueDate;
                                } else {
                                    roster.minAssignment = DISTANT_FUTURE_DATE;
                                }
                                roster.numCompletedAssignments = roster.reportingData.assignmentCompletionCount;
                            });

                        // order them by assignment due date
                        results = $.Enumerable.From(rosters).OrderBy('$.minAssignment').ToArray();

                        deferred.resolve(results);
                    });

                    return deferred.promise;
                },
                StudentRostersOnly: function() {
                    return ClassRoster.get({
                        studentId: true
                    }); // todo: use real id
                },
                Classes: function() {
                    return AssignmentFacadeService.getClassesReportingData();
                },
                StudentItemAnalysis: function() {
                    var deferred = $q.defer();

                    var getPlayerReport = function() {
                        AssessmentPlayerService.finalReport($route.current.params.sessionId, true).then(
                            function(data) {
                                var filteredAssessments = ReportService.studentTestReportList;
                                if (ReportService.currentProgram) {
                                    filteredAssessments = _.filter(ReportService.studentTestReportList,
                                        function(r) {
                                            return r.programs.length === 1 &&
                                                r.programs[0] === ReportService.currentProgram;
                                        });
                                }
                                deferred.resolve({
                                    assessments: filteredAssessments,
                                    current: data
                                });
                            });
                    };

                    if (!ReportService.studentTestReportList) {
                        var startDate = $route.current.params.filterStartDate.replace(/-/g, '/'),
                            endDate = $route.current.params.filterEndDate.replace(/-/g, '/');
                        ReportService.getStudentTestReport(
                                $route.current.params.classId,
                                $rootScope.currentUser.userId,
                                startDate,
                                endDate
                            )
                            .then(function() {
                                getPlayerReport();
                            });
                    } else {
                        getPlayerReport();
                    }

                    return deferred.promise;
                },
                StudentProgressRecap: function() {
                    var promise,
                        deferred = $q.defer(),
                        data = {
                            filters: {}
                        };

                    var getRecapRpt = function() {
                        data.filters.startDate = $route.current.params.filterStartDate.replace(/-/g, '/');
                        data.filters.endDate = $route.current.params.filterEndDate.replace(/-/g, '/');
                        data.filters.program = null;
                        data.counts = ReportService.studentProgressRecapCounts;
                        promise = ReportService.getStudentProgressRecap(
                            $route.current.params.classId,
                            data.filters.startDate,
                            data.filters.endDate,
                            data.filters.program,
                            $route.current.params.status
                        );

                        promise.then(function(results) {
                            data.assignments = results;
                            deferred.resolve(data);
                        });
                    };

                    if (!ReportService.studentProgressRecapCounts) {
                        var startDate = $route.current.params.filterStartDate.replace(/-/g, '/'),
                            endDate = $route.current.params.filterEndDate.replace(/-/g, '/');
                        promise = ReportService.getStudentProgressReportForStudent(
                            $route.current.params.classId,
                            startDate,
                            endDate
                        );

                        promise.then(function() {
                            // success handler
                            getRecapRpt();
                        });
                    } else {
                        getRecapRpt();
                    }

                    return deferred.promise;
                },
                CalendarEvents: function() {
                    var viewType = $rootScope.currentUser.getAttribute('classCalendar.view') || 'month';
                    var referenceDate = $rootScope.currentUser.getAttribute('classCalendar.currentRefDate') ||
                        new Date();
                    var dateRange = CalendarService.getDateRange(referenceDate, viewType);

                    return CalendarService.getEvents(
                        $route.current.params.classId, {
                            start: dateRange.startDate,
                            end: dateRange.endDate
                        }
                    );
                },
                CentersProgramListInfo: function() {
                    return ProgramsLandingService.getProgramListInfo(true);
                },
                CurrentProgramLoaded: function() {
                    //Need the current program for program dropdown list in subnav
                    var currentProgramLoaded = $q.defer();

                    if ($rootScope.currentProgram &&
                        $rootScope.currentProgram.id === $route.current.params.programId &&
                        $rootScope.currentProgram.version === $route.current.params.programVersion &&
                        !$rootScope.currentProgram.programDirty) {
                        currentProgramLoaded.resolve();
                    } else {
                        var isProgramParamsDefined = angular.isDefined($route.current.params.programId) &&
                            angular.isDefined($route.current.params.programVersion);

                        if (isProgramParamsDefined) {
                            Content.get({
                                contentId: $route.current.params.programId,
                                version: $route.current.params.programVersion,
                                levels: 1
                            }, true).then(function(program) {
                                $rootScope.currentProgram = program;
                                currentProgramLoaded.resolve();
                            });
                        } else {
                            //$log.log('Resolve: No Current Program.');
                            $rootScope.currentProgram = undefined;
                            currentProgramLoaded.resolve();
                        }
                    }

                    return currentProgramLoaded.promise;
                },
                CenterContainer: function() {
                    return Content.get({
                        contentId: $route.current.params.centerContainerId,
                        version: $route.current.params.centerContainerVersion,
                        levels: 1
                    }, true).then(function(centerContainer) {
                        return centerContainer.$setAssociatedItem('Teacher Support', true).then(
                            function() {
                                return centerContainer;
                            });
                    }, function() {
                        $q.reject();
                    });
                },
                CenterContainerTier: function() {
                    var deferredTier = $q.defer();

                    Content.get({
                        contentId: $route.current.params.itemId,
                        version: $route.current.params.itemVersion,
                        levels: 1
                    }, true).then(function(tier) {
                        var parent = NavigationService.routeParentByParams('tier', 'centerContainer');
                        var associativePropsPropagated = tier.$propagateAssociativeProps(parent);

                        var associativePropsAndTeacherSupportDone = [associativePropsPropagated];

                        if (tier.$hasAssociatedItem('Teacher Support')) {
                            var teacherSupportRetrieved = tier.$setAssociatedItem('Teacher Support');
                            associativePropsAndTeacherSupportDone.push(teacherSupportRetrieved);
                        }

                        return $q.all(associativePropsAndTeacherSupportDone).then(function() {
                            deferredTier.resolve(tier);
                        });
                    });

                    return deferredTier.promise;
                },
                CenterContent: function() {
                    var deferredItem = $q.defer();

                    Content.get({
                        contentId: $route.current.params.itemId,
                        version: $route.current.params.itemVersion,
                        levels: 1
                    }, true).then(function(item) {
                        var parent = NavigationService.routeParentByParams(
                            'center',
                            'tier2',
                            'tier',
                            'centerContainer'
                        );
                        var associativePropsPropagated = item.$propagateAssociativeProps(parent);

                        var associativePropsToolsTsDone = [associativePropsPropagated];

                        if (item.$hasAssociatedItem('Tools')) {
                            var toolsRetrieved = item.$setAssociatedItem('Tools');
                            associativePropsToolsTsDone.push(toolsRetrieved);
                        }

                        if (item.$hasAssociatedItem('Teacher Support')) {
                            var teacherSupportRetrieved = item.$setAssociatedItem('Teacher Support');
                            associativePropsToolsTsDone.push(teacherSupportRetrieved);
                        }

                        return $q.all(associativePropsToolsTsDone).then(function() {
                            deferredItem.resolve(item);
                        });
                    });

                    return deferredItem.promise;
                },
                UserMapping: function() {
                    var deferred = $q.defer(),
                        url = PATH.REST + '/externalMappings/user/';
                    $http.get(url).then(function(response) {
                        var responseData = response.data;
                        deferred.resolve(responseData);
                    }).catch(function(error) {
                        deferred.reject(error);
                    });
                    return deferred.promise;
                },
                isSessionValid: function() {
                    var deferred = $q.defer(),
                        url = PATH.REST + '/isSessionValid';
                    $http.get(url).then(function(response) {
                        var responseData = response.data;
                        deferred.resolve(responseData);
                    }).catch(function(error) {
                        deferred.reject(error);
                    });
                    return deferred.promise;
                }
            };
        }
    ]);
