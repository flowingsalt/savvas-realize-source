angular.module('Realize.earlyLearner.teacher.changeThemeCtrl', [
    'Realize.paths',
    'RealizeDataServices',
    'rlzComponents.components.i18n',
    'Realize.classRosterThemes.constants',
    'Realize.ui.modal.UnsavedChangesModal',
    'Realize.earlyLearner.teacher.earlyLearnerService',
    'Realize.alerts.alertService',
    'Realize.analytics'
])
    .controller('ChangeThemeCtrl', [
        '$rootScope',
        'EarlyLearnerService',
        'resolveClassRosterData',
        'EARLY_LEARNER_CONSTANTS',
        'UnsavedChangesModal',
        'AlertService',
        'lwcI18nFilter',
        'Analytics',
        'ClassRoster',
        'locationUtilService',
        'penpalService',
        function($rootScope, EarlyLearnerService, resolveClassRosterData,
            EARLY_LEARNER_CONSTANTS, UnsavedChangesModal, AlertService, lwcI18nFilter, Analytics, ClassRoster,
             locationUtilService, penpalService) {
            'use strict';
            var ctrl = this,
                hasEarlylearnerTheme = function(user) {
                    var userAttrs = user && user.userAttributes,
                        key = EARLY_LEARNER_CONSTANTS.PROFILE_KEY;
                    return userAttrs && userAttrs[key] === EARLY_LEARNER_CONSTANTS.THEME_EARLY_LEARNER;
                },
                unsavedChangesModal;
            ctrl.selectAll = true;
            ctrl.isPopupOpen = false;
            ctrl.hasUnsavedChanges = true;
            ctrl.students = resolveClassRosterData.students || [];
            ctrl.students.forEach(function(student) {
                student.themeSelected = hasEarlylearnerTheme(student);
                if (!student.themeSelected) {
                    ctrl.selectAll = false;
                }
            });

            ctrl.sendPenpalEvent =  function(action, payload) {
                if (locationUtilService.isDeeplinkStudentAndGroupTabActive()) {
                    penpalService.connectToParent().then(function(connection) {
                        connection.parent.exec(action, payload);
                    });
                }
            };

            ctrl.toggleAllStudents = function() {
                ctrl.students.forEach(function(student) {
                    student.themeSelected = ctrl.selectAll;
                });
            };

            ctrl.onSelectionChange = function(student) {
                var payload = { hasUnsavedChanges: true };
                ctrl.sendPenpalEvent('UNSAVED_CHANGES', payload);

                if (student.themeSelected) {
                    for (var i = ctrl.students.length - 1; i >= 0; i--) {
                        if (!ctrl.students[i].themeSelected) {
                            ctrl.selectAll = false;
                            return;
                        }
                        ctrl.selectAll = true;
                    }
                } else {
                    ctrl.selectAll = false;
                }
            };

            ctrl.changeTheme = function() {
                var selected = [],
                    unSelected = [];
                ctrl.students.forEach(function(student) {
                    if (student.themeSelected) {
                        selected.push(student);
                    } else {
                        unSelected.push(student);
                    }
                });
                ctrl.hasUnsavedChanges = false;
                ClassRoster.clearRostersWithStudentDetailsFromCache();
                EarlyLearnerService.saveTheme(selected, unSelected)
                    .then(
                        function() {
                            selected.forEach(function() {
                                Analytics.track('track.action', {
                                    category: 'Classes',
                                    action: 'Change Student Theme',
                                    label: 'EarlyLearner',
                                });
                            });
                            unSelected.forEach(function() {
                                Analytics.track('track.action', {
                                    category: 'Classes',
                                    action: 'Change Student Theme',
                                    label: 'Standard',
                                });
                            });
                            EarlyLearnerService.goBack();
                            AlertService.addAlert('success', 'ok-sign',
                                lwcI18nFilter('earlyLearner.changeTheme.successMessage'));
                            var payload = { hasUnsavedChanges: false };
                            ctrl.sendPenpalEvent('UNSAVED_CHANGES', payload);
                            if (ctrl.isPopupOpen) {
                                ctrl.sendPenpalEvent('CHANGES_SAVED', {});
                            }
                        },
                        function() {
                            AlertService.addAlert('error', 'exclamation-sign',
                                lwcI18nFilter('earlyLearner.changeTheme.errorMessage'));
                            ctrl.alertDetails = AlertService.alerts[0];
                            ctrl.alertIsSet = AlertService.alertIsSet();
                        }
                    );
            };

            ctrl.back = function(showDialog) {
                ctrl.hasUnsavedChanges = showDialog;
                EarlyLearnerService.goBack();
            };

            ctrl.showSubNavigation = function() {
                return !locationUtilService.isDeeplinkStudentAndGroupTabActive();
            };

            unsavedChangesModal = new UnsavedChangesModal(ctrl.changeTheme);

            $rootScope.$on('$locationChangeStart', function(event) {
                if (ctrl.hasUnsavedChanges && ctrl.changeThemeForm && ctrl.changeThemeForm.$dirty) {
                    unsavedChangesModal.showDialog(event).catch(function() {
                        $rootScope.viewLoading = false;
                    });
                }
            });

            window.addEventListener('message', function(event) {
                if (event.data === 'SAVE_CHANGES') {
                    ctrl.isPopupOpen = true;
                    ctrl.isInProgress = true;
                    ctrl.changeTheme();
                }
            });
        }
    ]);

