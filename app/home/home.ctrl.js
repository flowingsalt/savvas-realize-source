angular.module('RealizeApp')
//TODO: create an enum service?
.constant('HOME_STATES', {
    loading: 'LOADING',
    notStarted: 'NOT_STARTED',
    inProgress: 'IN_PROGRESS',
    complete: 'COMPLETE',
    noAssignment: 'NO_ASSIGNMENT',
    noClass: 'NO_CLASS',
    oneClass: 'ONE_CLASS',
    manyClasses: 'MANY_CLASSES',
    existingClass: 'EXISTING_CLASS',
    allHidden: 'ALL_HIDDEN',
    noAssociatedPrograms: 'NO_ASSOCIATED_PROGRAMS',
    firstVisit: 'FIRST_VISIT',
    noProgram: 'NO_PROGRAM',
    oneProgram: 'ONE_PROGRAM',
    manyPrograms: 'MANY_PROGRAMS',
    create: 'CREATE',
    none: 'NONE',
    findItems: 'FIND_ITEMS',
    mustAddStudentInSIS: 'MUST_ADD_STUDENT_IN_SIS'
})
//TODO: http://jira.pearsoncmg.com/jira/browse/RGHT-17301
//  UI: Restructure existing JS file structure into Specific Modules
.controller('HomeCtrl', [
    'Permissions',
    '$scope',
    'PATH',
    'SHARED_THUMBNAIL_PATH',
    'AssignmentFacadeService',
    '$log',
    '$filter',
    'CONTINEO_SERVER_URL',
    'CONTINEO_CAT_URL',
    'CONTINEO_SERVER_HELP_URL',
    '$rootScope',
    'Modal',
    '$location',
    '$currentUser',
    'BrowserInfo',
    'lwcI18nFilter',
    function(Permissions, $scope, PATH, SHARED_THUMBNAIL_PATH, AssignmentFacadeService, $log, $filter,
        CONTINEO_SERVER_URL, CONTINEO_CAT_URL, CONTINEO_SERVER_HELP_URL, $rootScope, Modal, $location, $currentUser,
        BrowserInfo, lwcI18nFilter) {

        'use strict';

        var backgroundChoice = $scope.currentUser.getAttribute('home.background') || 'teacher1',
            backgroundExtension = BrowserInfo.isHDDisplay ? '@2x.jpg' : '.jpg',
            user = $scope.currentUser,
            simpleDialogPath = PATH.TEMPLATES + '/templates/partials/simpleDialog.html';

        $scope.firstVisit = !user.getAttribute('home.visited');
        $scope.wizardComplete = user.getAttribute('profile.wizard') === 'complete';
        $scope.programsVisited = user.getAttribute('programs.visited');
        $scope.classesCreated = user.getAttribute('classes.created');
        $scope.classesVisited = user.getAttribute('classes.visited');
        $scope.assignmentsCreated = user.getAttribute('assignments.created');
        $scope.intercomTemplate = PATH.TEMPLATE_ROOT + '/app/home/teacher/intercom.html';
        $scope.classes = [];
        $scope.classesWithoutProduct = user.getAttribute('classes.withoutPrograms') || [];
        $scope.background = SHARED_THUMBNAIL_PATH + '/homepage/' + backgroundChoice + backgroundExtension;
        $scope.CONTINEO_SERVER_URL = CONTINEO_SERVER_URL;
        $scope.CONTINEO_CAT_URL = CONTINEO_CAT_URL;
        $scope.isFederatedUserNoClassesCreated = $currentUser.isFederatedUser && !$scope.classesCreated;
        $scope.hasPermission =  Permissions.hasPermission;
        $scope.homeLoaded = false;
        var isHomePage = $location.path().search('/home') >= 0;
        var isTeacher = $currentUser.hasRole('ROLE_TEACHER');
        var isIntercomEnabled = (window.intercomEnabled === 'true');
        $scope.showIntercom = isIntercomEnabled && isHomePage && isTeacher;

        $scope.$on('$destroy', function() {
            $scope.showIntercom = false;
            window.Intercom('shutdown');
        });

        var checkNoProgramsModal = function() {
            if (user.showNoProgramModal() && !$currentUser.isFederatedUser) {

                Modal.simpleDialog(
                    'noPrograms.modal.assignments.heading',
                    'noPrograms.modal.assignments.message',
                    {
                        OK: {
                            title: 'noPrograms.modal.action.ok',
                            handler: function() {
                                var classes = user.getAttribute('classes.withoutPrograms');
                                user.setAttribute('hideNoProgramModal', true);

                                if (classes.length > 1) {
                                    $location.path('classes');
                                } else {
                                    $location.path(['classes', classes[0], 'manage'].join('/'));
                                }
                            },
                            isDefault: true
                        },
                        CANCEL: {
                            title: 'noPrograms.modal.action.cancel',
                            handler: function() {
                                user.setAttribute('hideNoProgramModal', true);
                            }
                        }
                    },
                    {
                        id: 'assignModalNoPrograms'
                    }
                );
            }
        };

        // now we've visited (if we have already finished the profile wizard)
        if ($scope.wizardComplete) {
            $scope.currentUser.setAttribute('home.visited', true);
            if ($scope.firstVisit) {
                $scope.currentUser.setAttribute('home.visited', true);
                if ($scope.currentUser.getAttribute('isSelfRegUser')) {
                    var modalScope = $scope.$new(true);
                    modalScope.close = Modal.hideDialog;
                    Modal.showDialog('templates/partials/demo_first_visit_modal.html', modalScope);
                } else {
                    checkNoProgramsModal();
                }
            } else {
                checkNoProgramsModal();
            }
        }

        $scope.phase = {
            programs: {loaded: false},
            classes: {loaded: false},
            assignments: {loaded: false}
        };

        var showModalFederatedUserNoClasses = function() {
            var modalScope = $rootScope.$new();
            modalScope.title = lwcI18nFilter('federatedUser.teacherHome.modal.noAssociatedPrograms.header');
            modalScope.body = [
                lwcI18nFilter('federatedUser.teacherHome.modal.noAssociatedPrograms.body'),
                ' ',
                '<a class="underline" href="' + CONTINEO_CAT_URL + '">',
                lwcI18nFilter('federatedUser.teacherHome.modal.noAssociatedPrograms.url'),
                '</a>.'
            ].join('');
            modalScope.closeBtnClickHandler = function() {
                $scope.currentUser.setAttribute('federatedUser.noAssociatedPrograms.info.seen', true);
                Modal.hideDialog();
            };
            modalScope.buttons = [{
                    title:  lwcI18nFilter('global.action.button.ok'),
                    isDefault: true,
                    clickHandler: modalScope.closeBtnClickHandler
                }];
            Modal.showDialog(simpleDialogPath, modalScope);
        };

        // fix for issue where /home is called before /welcome and so unwanted modal appears in welcome page
        if (!$scope.currentUser.getAttribute('federatedUser.noAssociatedPrograms.info.seen') &&
            $scope.isFederatedUserNoClassesCreated &&
            $location.path().search('/welcome') !== 0) {

            showModalFederatedUserNoClasses();
        }

        $scope.showModalFederatedUserNoStudentAndAllClassesWithoutProduct = function() {
            var modalScope = $rootScope.$new();
            modalScope.title =
            lwcI18nFilter('federatedUser.teacherHome.modal.noAssociatedProgramsAndnoStudents.header');
            modalScope.body = [
                lwcI18nFilter('federatedUser.teacherHome.modal.noAssociatedProgramsAndnoStudents.bodyPart1'),
                ' ',
                '<a class="underline" href="' + CONTINEO_CAT_URL + '">',
                lwcI18nFilter('federatedUser.teacherHome.modal.noAssociatedProgramsAndnoStudents.url1'),
                '</a>',
                lwcI18nFilter('federatedUser.teacherHome.modal.noAssociatedProgramsAndnoStudents.bodyPart2'),
                ' ',
                '<a class="underline" target="_blank" href="' + CONTINEO_SERVER_HELP_URL + '">',
                lwcI18nFilter('federatedUser.teacherHome.modal.noAssociatedProgramsAndnoStudents.url2'),
                '</a>',
                lwcI18nFilter('federatedUser.teacherHome.modal.noAssociatedProgramsAndnoStudents.bodyPart3')
            ].join('');
            modalScope.closeBtnClickHandler = function() {
                $scope.currentUser.setAttribute('federatedUser.noStudents.info.seen', true);
                $scope.currentUser.setAttribute('federatedUser.noAssociatedPrograms.info.seen', true);
                Modal.hideDialog();
            };
            modalScope.buttons = [{
                title: lwcI18nFilter('global.action.button.ok'),
                isDefault: true,
                clickHandler: modalScope.closeBtnClickHandler
            }];
            Modal.showDialog(simpleDialogPath, modalScope);
        };

        $scope.showModalFederatedUserHasClassesWithoutStudent = function() {
            var modalScope = $rootScope.$new();
            modalScope.title = lwcI18nFilter('federatedUser.teacherHome.modal.HasClassesWithoutStudent.header');
            modalScope.body = [
                lwcI18nFilter('federatedUser.teacherHome.modal.HasClassesWithoutStudent.bodyPart1'),
                ' ',
                '<a class="underline" href="' + CONTINEO_CAT_URL + '">',
                lwcI18nFilter('federatedUser.teacherHome.modal.HasClassesWithoutStudent.url1'),
                '</a>',
                lwcI18nFilter('federatedUser.teacherHome.modal.HasClassesWithoutStudent.bodyPart2'),
                ' ',
                '<a class="underline" target="_blank" href="' + CONTINEO_SERVER_HELP_URL + '">',
                lwcI18nFilter('federatedUser.teacherHome.modal.HasClassesWithoutStudent.url2'),
                '</a>',
                lwcI18nFilter('federatedUser.teacherHome.modal.HasClassesWithoutStudent.bodyPart3')
            ].join('');
            modalScope.closeBtnClickHandler = function() {
                $scope.currentUser.setAttribute('federatedUser.noStudents.info.seen', true);
                Modal.hideDialog();
            };
            modalScope.buttons = [{
                    title:  lwcI18nFilter('global.action.button.ok'),
                    isDefault: true,
                    clickHandler: modalScope.closeBtnClickHandler
                }];
            Modal.showDialog(simpleDialogPath, modalScope);
        };

        $scope.showModalFederatedUserALLClassesWithoutProduct = function() {
            var modalScope = $rootScope.$new();
            modalScope.title = lwcI18nFilter('federatedUser.teacherHome.modal.aLLClassesWithoutProduct.header');
            modalScope.body = [
                lwcI18nFilter('federatedUser.teacherHome.modal.aLLClassesWithoutProduct.bodyPart1'),
                ' ',
                '<a class="underline" href="' + CONTINEO_CAT_URL + '">',
                lwcI18nFilter('federatedUser.teacherHome.modal.aLLClassesWithoutProduct.url1'),
                '</a>',
                lwcI18nFilter('federatedUser.teacherHome.modal.aLLClassesWithoutProduct.bodyPart2'),
                ' ',
                '<a class="underline" target="_blank" href="' + CONTINEO_SERVER_HELP_URL + '">',
                lwcI18nFilter('federatedUser.teacherHome.modal.aLLClassesWithoutProduct.url2'),
                '</a>',
                lwcI18nFilter('federatedUser.teacherHome.modal.aLLClassesWithoutProduct.bodyPart3')
            ].join('');
            modalScope.closeBtnClickHandler = function() {
                $scope.currentUser.setAttribute('federatedUser.noAssociatedPrograms.info.seen', true);
                Modal.hideDialog();
            };
            modalScope.buttons = [{
                    title:  lwcI18nFilter('global.action.button.ok'),
                    isDefault: true,
                    clickHandler: modalScope.closeBtnClickHandler
                }];
            Modal.showDialog(simpleDialogPath, modalScope);
        };

        // if we already have classes, load them up for step 2 and 3
        if ($scope.classesCreated === true) {
            $scope.rostersLoading = true;
            var promise = AssignmentFacadeService.getClassesReportingData($currentUser.isTeacher);
            promise.then(function(classRosterdata) {

                if ($currentUser.isTeacher) {
                    $scope.classes = classRosterdata.rosters;
                    $scope.teacherStat = classRosterdata.teacherStat;
                } else {
                    $scope.classes = classRosterdata;
                }

                $scope.numClasses = $scope.classes.length > 1 ? (' ' + $scope.classes.length + ' ') : ' ';
                $scope.phase.classes.loaded = $scope.phase.assignments.loaded = true;

                $scope.$broadcast('homeTeacherCtrl.rosters.load.complete');
            });
        } else {
            $scope.classes = [];
        }

        $scope.$watch('phase', function(newValue) {
            var programsLoaded = newValue.programs.loaded,
                classesLoaded = newValue.classes.loaded,
                assignmentsLoaded = newValue.assignments.loaded;

            if (programsLoaded && classesLoaded && assignmentsLoaded) {
                $scope.homeLoaded = true;
            }
        }, true);

    }
]);
