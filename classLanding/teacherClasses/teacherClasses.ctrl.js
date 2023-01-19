angular.module('Realize.classLanding.teacherClassesCtrl', [
    'RealizeDataServices',
    'ModalServices',
    'Realize.assignment.facadeService',
    'Realize.core.security.permissions',
    'Realize.paths',
    'Realize.filters.pipes',
    'Realize.filters.excludeCurrentUser',
    'Realize.filters.displayFullName',
    'Realize.common.alerts',
    'Realize.common.mediaQueryService',
    'rlzComponents.components.googleClassroom',
    'Realize.constants.googleClassroom',
    'Realize.analytics',
    'rlzComponents.components.featureManagement',
    'rlzComponents.components.googleClassroom.constants',
])
.controller('TeacherClassesCtrl', [
    '$scope',
    'Permissions',
    'ClassRoster',
    '$location',
    '$log',
    '$currentUser',
    'ActiveRosters',
    'Modal',
    '$timeout',
    'lwcI18nFilter',
    'AssignmentFacadeService',
    'PATH',
    'AlertService',
    'MediaQuery',
    'googleClassroomService',
    'GOOGLE_CLASSROOM',
    'Analytics',
    '$q',
    'GoogleClassroomConstants',
    'featureManagementService',
    function($scope, Permissions, ClassRoster, $location, $log, $currentUser, ActiveRosters, Modal,
        $timeout, lwcI18nFilter, AssignmentFacadeService, PATH, AlertService, MediaQuery, googleClassroomService,
             GOOGLE_CLASSROOM, Analytics, $q, GoogleClassroomConstants, featureManagementService) {
        'use strict';

        $scope.collapseQuickList = !MediaQuery.breakpoint.isDesktop;

        $scope.rosters = ActiveRosters;

        $scope.zeroRostersState = (ActiveRosters.length === 0);

        $scope.location = $location;

        $scope.hasPermission = Permissions.hasPermission;

        $scope.nowShowing = 'current';

        $scope.showGoogleClassroomIntegration = function() {
            return $currentUser.isTeacher && featureManagementService.isGoogleClassroomEnabled() &&
                !$currentUser.isLtiAUser;
        };

        $scope.showGoogleClassIcon = function(roster) {
            return roster.isGoogleClass() && !roster.googleLinkedClass;
        };

        $scope.createClassesOptionsTemplate = 'templates/partials/googleClassroom/createClassesOptions.html';

        $currentUser.setAttribute('classes.visited', true);

        // used to filter the display array while in hidden mode
        $scope.filterByStatus = function(roster) {
            if ($scope.nowShowing === 'hidden' && roster.status === 'ACTIVE') {
                return false;
            }
            return true;
        };

        // used to filter only class IDs
        $scope.extractClassIDs = function(roster) {
            return roster.classId;
        };

        // used to filter the Google classes
        var isGoogleClass = function(roster) {
            return roster.rosterSource === GOOGLE_CLASSROOM.ROSTER_SOURCE.GOOGLE_CLASSROOM;
        };

        $scope.hasHidden = $currentUser.$getInactiveRosterCount() > 0;

        if (!$currentUser.showNoProgramModal()) {
            $scope.alertDetails = AlertService.alerts[0];
            $scope.alertIsSet = AlertService.alertIsSet();
        }

        $scope.retrieveHiddenGoogleClasses = function(allClassRosters) {
            var deffered = $q.defer();
            var googleClasses = _.filter(allClassRosters, isGoogleClass);
            var isGoogleClassroomEnabled = featureManagementService.isGoogleClassroomEnabled();

            if (googleClasses && googleClasses.length > 0 && isGoogleClassroomEnabled) {
                var hiddenClassIds = JSON.stringify(_.map(googleClasses, $scope.extractClassIDs));

                // GraphQL query to get course states for hidden google classes
                var getGoogleClassStateQuery = 'query {getClassStatus(classIds:' + hiddenClassIds  + ') {' +
                    'classStatus{classId courseState}}}';
                googleClassroomService.classSyncServiceQuery(getGoogleClassStateQuery)
                    .then(function(data) {
                        var result = data.data.getClassStatus;
                        if (result !== undefined && result.classStatus.length > 0) {
                            var googleCourseStatus = result.classStatus;
                            googleCourseStatus.forEach(function(googleClass) {
                                var matchedResult = _.findWhere(allClassRosters, {
                                    'classId': googleClass.classId
                                });
                                matchedResult.courseState = googleClass.courseState;
                            });
                        }
                        deffered.resolve(allClassRosters);
                    }, function(errorResponse) {
                        $log.error('error getting roster course states', errorResponse);
                        deffered.reject(errorResponse);
                    });
            } else {
                deffered.resolve(allClassRosters);
            }
            return deffered.promise;
        };

        $scope.$watch('nowShowing', function(showing, old) {
            //$log.log("nowShowing watch", showing, old);
            if (showing === old) {return;}

            $scope.pageLoading();

            // todo: loading & user attribute
            if (showing === 'hidden') {
                $scope.rosters = null;
                ClassRoster.get({statusFilter: 'Inactive', noCachedData: true})
                    .then(function(rosters) {
                        $scope.retrieveHiddenGoogleClasses(rosters)
                            .then(function(allClassRosters) {
                                $scope.rosters = _.filter(allClassRosters, $scope.filterByStatus);
                                $scope.zeroRostersState = $scope.rosters.length === 0;
                                $scope.pageLoaded();
                            })
                            .catch(function(errorResponse) {
                                $log.error('error getting rosters', errorResponse);
                            });
                    }, function(err) {
                        $log.error('error getting rosters', err);
                    });
            }

            if (showing === 'current') {
                AssignmentFacadeService.getClassesReportingData().then(function(response) {
                    $scope.rosters = response;
                    $scope.zeroRostersState = ($scope.rosters.length === 0);
                    $scope.pageLoaded();
                }, function() {
                    $log.error('error getting rosters with reporting data');
                });
            }
        });

        $scope.openRoster = function(e, roster) {
            e.preventDefault();
            e.stopPropagation();

            $log.log('manage quicklink clicked', roster);

            $location.path('/classes/' + roster.classId + '/manage');
        };

        $scope.hideRoster = function(e, roster) {
            e.preventDefault();
            e.stopPropagation();

            var showClassHideWarning = $currentUser.isFederatedUser;
            var modalScope;
            var closeModal = function() {
                Modal.hideDialog();
            };

            var confirm = function() {
                var progressModal = Modal.progressDialog($scope.$new(), {
                    progressHeader: lwcI18nFilter('classList.hideProgress.title'),
                    progressMessage: lwcI18nFilter('classList.hideProgress.message')
                }).then(function() {
                    progressModal.fakeProgress();
                });

                roster.$hide(function() {
                    roster.$clearCache();
                    progressModal.then(function() {
                        progressModal.progressComplete();
                        $currentUser.$setInactiveRosterCount($currentUser.$getInactiveRosterCount() + 1);

                        //we just hid a roster, so hasHidden is always true here
                        $scope.hasHidden = true;
                        var timer = $timeout(Modal.hideDialog, 750);
                        $scope.$on('$destroy', function destroy() {
                            $timeout.cancel(timer);
                        });
                    });
                });
            };

            if (showClassHideWarning) {
                modalScope = $scope.$new();
                modalScope.dialogId = 'hideRosterWarningModal';
                modalScope.title = lwcI18nFilter('classList.autoPlus.classHide.title');
                modalScope.body = lwcI18nFilter('classList.autoPlus.classHide.message');
                modalScope.isDismissible = false;
                modalScope.buttons = [{
                    title: lwcI18nFilter('assessmentBuilder.action.cancel'),
                    clickHandler: closeModal
                }, {
                    title: lwcI18nFilter('global.action.button.ok'),
                    clickHandler: confirm,
                    isDefault: true
                }];
                modalScope.dismissed = false;
                modalScope.closeBtnClickHandler = closeModal;

                Modal.showDialog('templates/partials/simpleDialog.html', modalScope);
            } else {
                confirm();
            }
        };

        $scope.unhideRoster = function(e, roster) {
            e.preventDefault();
            e.stopPropagation();

            var rosters = $scope.rosters,
                progressModal = Modal.progressDialog($scope.$new(), {
                    progressHeader: lwcI18nFilter('classList.unhideProgress.title'),
                    progressMessage: lwcI18nFilter('classList.unhideProgress.message')
                }).then(function() {
                    progressModal.fakeProgress();
                });

            roster.$unhide(function() {
                roster.$clearCache();
                progressModal.then(function() {
                    if ($scope.nowShowing === 'hidden') {
                        $scope.rosters = _.filter(rosters, $scope.filterByStatus);
                    }

                    progressModal.progressComplete();
                    var newInactiveCount = $currentUser.$getInactiveRosterCount() - 1;
                    $currentUser.$setInactiveRosterCount(newInactiveCount);
                    $scope.hasHidden = newInactiveCount > 0;
                    // flip back to current view if we've revealed them all
                    if (!$scope.hasHidden) {
                        $scope.nowShowing = 'current';
                    }
                    // delay closing of modal for a short bit while we do the above...
                    var timer = $timeout(Modal.hideDialog, 750);
                    $scope.$on('$destroy', function destroy() {
                        $timeout.cancel(timer);
                    });
                });
            });
        };

        $scope.deleteRoster = function(e, roster) {
            e.preventDefault();
            e.stopPropagation();

            var modalScope,
                suppressDeleteWarning = $currentUser.getAttribute('classRoster.suppressDeleteWarning');

            var closeModal = function() {
                Modal.hideDialog();
            };

            var confirm = function() {
                if (modalScope.dismissed) {
                    $currentUser.$toggleAttribute('classRoster.suppressDeleteWarning');
                }

                roster.$delete(function() {
                    var idx = $scope.rosters.indexOf(roster);
                    $scope.rosters.splice(idx, 1);

                    Modal.hideDialog();
                });
            };

            if (!suppressDeleteWarning) {
                modalScope = $scope.$new();
                modalScope.dialogId = 'deleteRosterWarningModal';
                modalScope.title = 'Delete Class Roster';
                modalScope.body = 'Are you sure you want to delete this class roster? This cannot be undone.';
                modalScope.isDismissible = true;
                modalScope.buttons = [
                    {title: 'Cancel', clickHandler: closeModal},
                    {title: 'Ok', clickHandler: confirm, isDefault: true}
                ];
                modalScope.dismissed = false;
                modalScope.closeBtnClickHandler = closeModal;

                Modal.showDialog('templates/partials/simpleDialog.html', modalScope);
            } else {
                roster.$delete(function() {
                    var idx = $scope.rosters.indexOf(roster);
                    $scope.rosters.splice(idx, 1);
                });
            }
        };

        $scope.deleteAllRosters = function(e) {
            e.preventDefault();
            e.stopPropagation();

            ClassRoster.deleteAll(function() {
                $scope.rosters = [];
            });
        };

        $scope.openAssignments = function(e, roster) {
            e.preventDefault();
            e.stopPropagation();

            // since this is default click behavior for the row, if we're viewing hidden, we dont want that
            if ($scope.nowShowing === 'hidden' || roster.status === 'INACTIVE') {return;}

            $location.path('/classes/' + roster.classId + '/assignments');
        };

        $scope.openCalendar = function(e, roster) {
            e.preventDefault();
            e.stopPropagation();

            // since this is default click behavior for the row, if we're viewing hidden, we dont want that
            if ($scope.nowShowing === 'hidden') {return;}

            $location.path('/classes/' + roster.classId + '/calendar');
        };

        $scope.openPrompt = function(e, roster) {
            e.preventDefault();
            e.stopPropagation();

            $location.path('/classes/' + roster.classId + '/discussPrompt');
        };

        $scope.showHiddenClasses = function(e) {
            e.preventDefault();
            e.stopPropagation();

            $scope.nowShowing = 'hidden';
        };

        $scope.openStudents = function(e, roster) {
            e.preventDefault();
            e.stopPropagation();

            $location.path('/classes/' + roster.classId + '/students');
        };

        // Reviewer Logic
        if ($currentUser.isReviewer) {
            $scope.reviewTemplate = 'templates/partials/reviewer_zero_classes.html';
            $scope.imagePath = PATH.IMAGES;
            $scope.showReviewZero = !$currentUser.getAttribute('classes.created');
            //$scope.showReviewZero = true;
        } else {
            $scope.showReviewZero = false;
        }

        $scope.$on('window.breakpoint.change', function bpChanged() {
            $scope.collapseQuickList = !MediaQuery.breakpoint.isDesktop;
        });

        $scope.redirectToRealizeSyncWebApp = function() {
            var connectClassesTelemetryObject = {
                extensions: {
                    area: GoogleClassroomConstants.CLASSES,
                    page: GoogleClassroomConstants.SELECT_A_CLASS,
                    product: GoogleClassroomConstants.EVENT_TYPE.PROGRAM_NOT_AVAILABLE,
                    description: GOOGLE_CLASSROOM.GOOGLE_CONNECT
                },
                definition: {
                    name: GOOGLE_CLASSROOM.CONNECT_CLASS,
                }
            };
            googleClassroomService.redirectToRealizeSyncWebApp($location.absUrl(), GoogleClassroomConstants.LAUNCH,
                connectClassesTelemetryObject);
        };

        $scope.redirectToCreateClasses = function() {
            Analytics.track('track.action', {
                category: 'Classes',
                action: 'Create classes'
            });
            $location.path('/classes/create');
            $location.search({});
        };

        $scope.isClassDeletedArchived = function(roster) {
            return (roster.googleStatus === GOOGLE_CLASSROOM.ARCHIVED_LOWERCASE ||
                    roster.googleStatus === GOOGLE_CLASSROOM.DELETED_LOWERCASE);
        };

        $scope.isRosterActive = function(roster) {
            return (roster.status === 'ACTIVE' && $scope.nowShowing !== 'hidden' &&
                !$scope.isClassDeletedArchived(roster));
        };

        $scope.redirectToGoogleClassroom = function(classId, rosterSource) {
            var unarchiveTelemetryObject = {
                extensions: {
                    area: GoogleClassroomConstants.CLASSES,
                    page: GoogleClassroomConstants.SELECT_A_CLASS,
                    product: GoogleClassroomConstants.EVENT_TYPE.PROGRAM_NOT_AVAILABLE,
                    description: GOOGLE_CLASSROOM.GOOGLE_UNARCHIVE
                },
                definition: {
                    name: GOOGLE_CLASSROOM.UNARCHIVE_CLASS,
                },
            };
            googleClassroomService.redirectToGoogleClass(classId, rosterSource, GOOGLE_CLASSROOM.UNARCHIVE,
                unarchiveTelemetryObject);
        };

        $scope.checkHiddenGoogleClass = function(roster) {
            return roster.isGoogleClass() && (roster.courseState === GOOGLE_CLASSROOM.DELETED ||
                    roster.courseState === GOOGLE_CLASSROOM.ARCHIVED);
        };

        $scope.isInactiveHiddenClass = function(roster) {
            return roster.status !== GOOGLE_CLASSROOM.ACTIVE && $scope.nowShowing === GOOGLE_CLASSROOM.HIDDEN;
        };
    }
]);
