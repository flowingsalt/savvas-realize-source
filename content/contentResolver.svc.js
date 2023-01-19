angular.module('Realize.content.contentResolver', [
        'Realize.assessment.assessmentDataService',
        'Realize.content.model.contentItem',
        'Realize.content.contentSourceService',
        'Realize.content.constants',
        'components.realize.user',
        'rlzComponents.components.featureManagement',
    ])
    .factory('ContentResolver', [
        '$rootScope',
        '$route',
        '$log',
        '$q',
        '$window',
        'Content',
        'ContentSource',
        'Assessment',
        'MEDIA_TYPE',
        'LwcRumbaDataService',
        'featureManagementService',
        function($rootScope, $route, $log, $q, $window, Content, ContentSource, Assessment, MEDIA_TYPE,
            LwcRumbaDataService, featureManagementService) {
            'use strict';

            return function(overrideContentId, overrideContentVersion) {
                $log.log('overrideContentId, overrideContentVersion ', overrideContentId, overrideContentVersion);

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
                        contentId: overrideContentId || $route.current.params.itemId,
                        version: overrideContentVersion || $route.current.params.itemVersion,
                        levels: 1
                    })
                    .then(
                        function(contentItem) {
                            if (featureManagementService.isAssessmentMaintenancePageEnabled()) {
                                setTasksContentAndFinish(contentItem);
                                return deferred.promise;
                            }
                            if (!contentItem.isOpenEdItem() && contentItem.$isTestNavTest()) {
                                Assessment.getInfo(contentItem.id, contentItem.version).then(function(result) {
                                    if (result.externalProps) {
                                        contentItem.qtiExternalProps = result.externalProps;
                                        contentItem.hasEssayScoring = result.hasEssayScoring;
                                        contentItem.isReviewMode = $route.current.params.isReviewMode;
                                    }
                                    setTasksContentAndFinish(contentItem);
                                }, function(err) {
                                    $log.error('Failed to get assessment info', err);
                                    setTasksContentAndFinish(brokenContent);
                                });
                            } else if (contentItem.isOpenEdItem()) {
                                var openEdOptionalParams = {};

                                openEdOptionalParams.launchUrl = contentItem.url;
                                Content.getLtiLaunchInfo(contentItem.externalItemId, null, openEdOptionalParams)
                                    .then(function(launchInfo) {
                                        contentItem.ltiLaunchSettings = launchInfo.settings;
                                        contentItem.ltiLaunchParams = launchInfo.launchParams;
                                        setTasksContentAndFinish(contentItem);
                                    })
                                    .catch(function(err) {
                                        $log.error('Failed to get LTI content item params', err);
                                        setTasksContentAndFinish(brokenContent);
                                    });
                            } else if (angular.isFunction(contentItem.isLtiItem) && contentItem.isLtiItem()) {
                                var programId = $route.current.params.programId,
                                    programVersion = $route.current.params.programVersion,
                                    classId = $route.current.params.classId,
                                    assignmentId = $route.current.params.assignmentId,
                                    optionalParams = {};

                                //content could be launched from program TOC, or from class assignment, etc...
                                //have to check to parent program/version b/c of this
                                if (programId) {
                                    optionalParams.programId = programId;
                                }

                                if (programVersion) {
                                    optionalParams.programVersion = programVersion;
                                }
                                if (classId) {
                                    optionalParams.classId = classId;
                                }
                                if (assignmentId) {
                                    optionalParams.assignmentId = assignmentId;
                                }

                                if (assignmentId) {
                                    optionalParams.assignmentId = assignmentId;
                                }

                                Content.getLtiLaunchInfo(contentItem.id, contentItem.version, optionalParams)
                                    .then(function(launchInfo) {
                                        contentItem.ltiLaunchSettings = launchInfo.settings;
                                        contentItem.ltiLaunchParams = launchInfo.launchParams;
                                        setTasksContentAndFinish(contentItem);
                                    })
                                    .catch(function(err) {
                                        if (err.data.errorCode === 'MISSING_REQUIRED_FIELDS' &&
                                            err.data.data.includes('ASSIGNMENT_ID')) {
                                            $log.error('Failed to get assignment Id', err.data.errorMessage);
                                            contentItem.hasAssignmentId = false;
                                            contentItem.ltiLaunchSettings = { openNewWindow: true };
                                            setTasksContentAndFinish(contentItem);
                                        } else {
                                            $log.error('Failed to get LTI content item params', err);
                                            setTasksContentAndFinish(brokenContent);
                                        }
                                    });
                            } else if (contentItem.essayPrompt) {
                                contentItem.hasEssayScoring = true;
                                setTasksContentAndFinish(contentItem);
                            } else {
                                if (contentItem.mediaType === MEDIA_TYPE.REALIZE_READER_SELECTION) {
                                    contentItem.samlTicket = '';
                                    //url is in format: http(s)://{RRBase}/launch.html/book/{bookId}
                                    //Inorder to get RR base to generate a saml ticket, spliting it by 'launch.html'
                                    var baseUrl = '';
                                    try {
                                        baseUrl = contentItem.url.split('launch.html')[0];
                                        LwcRumbaDataService.getSAMLTicket(baseUrl)
                                            .then(function(response) {
                                                contentItem.samlTicket = response;
                                                setTasksContentAndFinish(contentItem);
                                            }, function(err) {
                                                $log.error('Failed to get saml ticket', err);
                                                setTasksContentAndFinish(contentItem);
                                            });
                                    }
                                    catch (e) {
                                        $log.error('Failed to get RRS content item params', e);
                                        setTasksContentAndFinish(brokenContent);
                                    }
                                } else if (contentItem.mediaType === MEDIA_TYPE.LEARNING_RESOURCE) {
                                    contentItem.samlTicket = '';
                                    var resourceClass = $route.current.params.classId;
                                    var resourceAssignmentId = $route.current.params.assignmentId;
                                    var toolDomain = (contentItem.url.split('//')[1]).split('/')[0];
                                    var ltiServiceUrl = $window.ltiServiceWebToolLaunchUrl;
                                    var resourceId = 'resourceId=' + contentItem.id;
                                    var resourceName = 'resourceName=' + contentItem.title;
                                    var resourceURL = 'resourceURL=' + contentItem.url;
                                    var resourceToolDomain = 'toolDomain=' + toolDomain;
                                    var resourceVersion = 'resourceVersion=' + contentItem.version;
                                    var ltiBaseUrl =  ltiServiceUrl + '?' + resourceToolDomain;
                                    var ltiUrlWithQueryParams = [ltiBaseUrl, resourceId, resourceVersion,
                                        resourceName, resourceURL].join('&');
                                    if (resourceClass) {
                                        ltiUrlWithQueryParams = ltiUrlWithQueryParams + '&classId=' + resourceClass;
                                    }
                                    if (resourceAssignmentId) {
                                        ltiUrlWithQueryParams = ltiUrlWithQueryParams + '&assignmentId=' +
                                        resourceAssignmentId;
                                    }
                                    try {
                                        LwcRumbaDataService.getSAMLTicket(ltiUrlWithQueryParams)
                                            .then(function(response) {
                                                contentItem.samlTicket = response;
                                                var samlTicket = 'ticket=' + response;
                                                var encodedLtiQueryParams = [resourceToolDomain, resourceId,
                                                    resourceVersion, resourceName, resourceURL].join('&');
                                                if (resourceClass) {
                                                    encodedLtiQueryParams = encodedLtiQueryParams + '&classId=' +
                                                        resourceClass;
                                                }
                                                if (resourceAssignmentId) {
                                                    encodedLtiQueryParams = encodedLtiQueryParams + '&assignmentId=' +
                                                    resourceAssignmentId;
                                                }
                                                encodedLtiQueryParams = encodedLtiQueryParams + '&' + samlTicket;
                                                var encodedLtiLaunchUrl = ltiServiceUrl +
                                                    '?' + encodeURIComponent(encodedLtiQueryParams);
                                                contentItem.launchUrl = encodedLtiLaunchUrl;
                                                setTasksContentAndFinish(contentItem);
                                            }, function(err) {
                                                $log.error('Failed to get saml ticket', err);
                                                setTasksContentAndFinish(contentItem);
                                            });
                                    }
                                    catch (e) {
                                        $log.error('Failed to get learning resource content item params', e);
                                        setTasksContentAndFinish(brokenContent);
                                    }
                                } else {
                                    setTasksContentAndFinish(contentItem);
                                }
                            }
                        },
                        function(err) {
                            $log.error('Failed to retrieve item', err);
                            setTasksContentAndFinish(brokenContent);
                        }
                    );

                return deferred.promise;
            };
        }
    ]);
