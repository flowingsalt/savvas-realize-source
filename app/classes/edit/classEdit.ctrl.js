angular.module('Realize.classes.edit', [
    'rlzComponents.components.googleClassroom',
    'Realize.core.security.permissions',
    'RealizeDataServices',
    'Realize.analytics',
    'Realize.constants.googleClassroom',
    'rlzComponents.components.googleClassroom.constants',
    'rlzComponents.components.featureManagement',
    'Realize.earlyLearner.teacher.earlyLearnerService'
])
    .controller('ClassEditCtrl', [
        '$q',
        'Permissions',
        '$scope',
        '$rootScope',
        'ClassRosterData',
        'ClassRoster',
        '$location',
        'Modal',
        '$log',
        'lwcI18nFilter',
        'TEMPLATE_PATH',
        'CONTINEO_SERVER_URL',
        'CONTINEO_CAT_URL',
        'Analytics',
        'GOOGLE_CLASSROOM',
        'googleClassroomService',
        'GoogleClassroomConstants',
        'featureManagementService',
        'EarlyLearnerService',
        function($q, Permissions, $scope, $rootScope, ClassRosterData, ClassRoster, $location, Modal, $log,
            lwcI18nFilter, templatePath, CONTINEO_SERVER_URL, CONTINEO_CAT_URL, Analytics, GOOGLE_CLASSROOM,
                 googleClassroomService, GoogleClassroomConstants, featureManagementService, EarlyLearnerService) {
            'use strict';

            var isCheckForUnsavedChanges = true,
                orgPrograms;

            $scope.CONTINEO_SERVER_URL = CONTINEO_SERVER_URL;
            $scope.CONTINEO_CAT_URL = CONTINEO_CAT_URL;
            $scope.hasPermission = function(feature) {
                return $scope.isGoogleClass ? false : Permissions.hasPermission(feature);
            };
            $scope.roster = ClassRosterData;
            $scope.undoRoster = angular.copy($scope.roster);
            $scope.rosterSuccess = false;
            $scope.rosterError = false;
            $scope.productCount = $scope.roster.productIds.length;
            $scope.rosterAffiliation = _.findWhere($scope.currentUser.oleAffiliations,
                {organizationId: $scope.roster.organizationId});
            $scope.hasInstitution = $scope.rosterAffiliation &&
                $scope.rosterAffiliation.orgDetails &&
                $scope.rosterAffiliation.orgDetails.displayName;

            $scope.isGoogleClass = (ClassRosterData.rosterSource === GOOGLE_CLASSROOM.ROSTER_SOURCE.GOOGLE_CLASSROOM ||
                ClassRosterData.googleLinkedClass);

            orgPrograms = $scope.rosterAffiliation ? $scope.rosterAffiliation.products : {};

            $scope.subscribedPrograms = _.where(orgPrograms, {subscribed: true});

            $scope.$watch('subscribedPrograms', function() {
                angular.forEach($scope.subscribedPrograms, function(program) {
                    program.checked = $scope.undoRoster.$hasProductId(program.productId);
                });
            });

            $scope.isClassSettingsIntegrationEnabled = function() {
                return featureManagementService.isExternalClassSettingsEnabled();
            };

            $rootScope.$on('class.settings.theme.updated', function(event, payload) {
                var elStudents = [];
                var students = [];
                if (payload.learningExperience === 'Standard') {
                    students = payload.students;
                }
                if (payload.learningExperience === 'EarlyLearner') {
                    elStudents = payload.students;
                }
                ClassRoster.clearRostersWithStudentDetailsFromCache();
                EarlyLearnerService.saveTheme(elStudents, students);
            });

            $rootScope.$on('class.settings.saved', function() {
                $scope.roster.$updateCache();
            });

            //TODO: Replace $.Enumerable with use _.filter and _.map
            $scope.rosterThumbs = $.Enumerable.From(ClassRoster.thumbnailBank)
                .Select('a => {caption: a.caption, image: a.image, url: \'' +
                    ClassRoster.thumbnailRoot + '\' + a.image}')
                .ToArray();

            $scope.federatedClassSettingAlert = {
                showAlert: true,
                title: lwcI18nFilter('federatedUser.editClass.alert.title'),
                description: lwcI18nFilter('federatedUser.editClass.alert.description1') +
                    '<a class="underline" target="_self" href="' + CONTINEO_CAT_URL + '">' +
                lwcI18nFilter('federatedUser.editClass.alert.description2') + '</a>',
                closeFn: function() {
                    $scope.federatedClassSettingAlert.showAlert = false;
                }
            };

            $scope.selectThumb = function(thumb) {
                $scope.undoRoster.classImageUrl = thumb.url;
                $scope.selectedThumb = thumb;

                // not a typical form element, dirty it up
                $scope.step1Form.$setDirty();
            };

            $scope.isSelectedThumbnail = function(thumb) {
                var sanitizedThumbnailUrl = $scope.undoRoster.classImageUrl.replace('@2x', '');
                return thumb.url === sanitizedThumbnailUrl;
            };

            $scope.saveRoster = function(successCallback) {
                if ($scope.undoRoster.productIds.length < 1) {
                    $log.warn('detailsForm is invalid, no programs');
                    $scope.programError = true;
                    return $q.reject('form is invalid!');
                }

                if ($scope.step1Form.$valid) {
                    var progressModal = Modal.progressDialog($scope.$new(), {
                        progressHeader: lwcI18nFilter('editClass.savingProgress.title'),
                        progressMessage: lwcI18nFilter('editClass.savingProgress.message')
                    }).then(function() {
                        progressModal.fakeProgress();
                    });

                    $scope.undoRoster.updateTheme = $scope.undoRoster.learningExperience !==
                        $scope.roster.learningExperience;
                    if ($scope.undoRoster.updateTheme) {
                        Analytics.track('track.action', {
                                category: 'Classes',
                                action: 'Change Theme',
                                label: $scope.undoRoster.learningExperience,
                            });
                    }
                    $scope.undoRoster.$save(function(roster) {
                        $scope.currentUser.removeClassWithoutPrograms(roster.classId);

                        progressModal.then(function() {
                            progressModal.progressComplete().then(function() {
                                Modal.hideDialog();
                            });
                        });

                        $scope.rosterSuccess = true;
                        // update the roster
                        angular.copy($scope.undoRoster, $scope.roster);
                        $scope.step1Form.$setPristine();
                        // update userAttributes as needed
                        if (!$scope.currentUser.getAttribute('classes.created')) {
                            $scope.currentUser.setAttribute('classes.created', true);
                        }
                        var noProductClasses = $scope.currentUser.getAttribute('classes.withoutPrograms') || [];
                        if (roster.productIds.length === 0) {
                            // shouldn't be able to happen, but figure better safe than sorry
                            if (!_.contains(noProductClasses, roster.classId)) {
                                noProductClasses.push(roster.classId);
                            }
                        } else {
                            noProductClasses = _.without(noProductClasses, roster.classId);
                        }
                        $scope.currentUser.setAttribute('classes.withoutPrograms', noProductClasses);

                        if (angular.isDefined(successCallback)) {
                            successCallback();
                        }
                    });
                }
            };

            $scope.setProductId = function(val) {
                $log.log('setProductId', val, $scope.undoRoster.productIds);

                if ($scope.roster.$hasProductId(val)) {
                    // do nothing, we don't modify
                    return;
                }

                if ($scope.undoRoster.$hasProductId(val)) {
                    $scope.undoRoster.productIds = _.without($scope.undoRoster.productIds, val);
                    $scope.productCount = $scope.undoRoster.productIds.length;
                } else {
                    $scope.undoRoster.productIds.push(val);
                    $scope.productCount = $scope.undoRoster.productIds.length;
                }
                $scope.step1Form.$setDirty();
            };

            $scope.openStudents = function(e, roster) {
                e.preventDefault();
                e.stopPropagation();

                $location.path('/classes/' + roster.classId + '/students');
            };

            $scope.navigationFallback = '/classes';

            $rootScope.$on('$locationChangeStart', function(event, next, current) {
                var modalScope;
                if (isCheckForUnsavedChanges && $scope.step1Form && $scope.step1Form.$dirty) {
                    event.preventDefault();

                    modalScope = $scope.$new();
                    modalScope.delegate = {
                        close: function() {
                            Modal.hideDialog();
                            isCheckForUnsavedChanges = true;
                            $rootScope.viewLoading = false;
                        },
                        discard: function() {
                            Modal.hideDialog();
                            isCheckForUnsavedChanges = false;
                            $location.url(next.replace(current.replace($location.url(), ''), ''));
                        },
                        save: function() {
                            Modal.hideDialog();
                            isCheckForUnsavedChanges = false;
                            $scope.saveRoster(function() {
                                $location.url(next.replace(current.replace($location.url(), ''), ''));
                            });
                        }
                    };

                    Modal.showDialog('templates/partials/unsaved_edit_dialog.html', modalScope);
                }
            });

            $scope.redirectToGoogleClassroom = function() {
                var editClassTelemetryObject = {
                    extensions: {
                        area: GoogleClassroomConstants.CLASSES,
                        page: GOOGLE_CLASSROOM.EDIT_CLASS_SETTINGS,
                        product: GoogleClassroomConstants.EVENT_TYPE.PROGRAM_NOT_AVAILABLE,
                        description: GOOGLE_CLASSROOM.GOOGLE_EDIT_CLASS
                    },
                    definition: {
                        name: GOOGLE_CLASSROOM.CONNECT_CLASS,
                    }
                };
                googleClassroomService.redirectToGoogleClass($scope.roster.classId, $scope.roster.rosterSource,
                    GOOGLE_CLASSROOM.OPEN, editClassTelemetryObject);
            };
        }
    ]);
