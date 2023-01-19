angular.module('Realize.sidebar.GroupsSidebarCtrl', [
    'RealizeApp',
    'Realize.content',
    'Realize.common.alerts'
])
    .controller('GroupsSidebarCtrl', [
        '$scope',
        '$rootScope',
        '$location',
        'InlineAlertService',
        'Content',
        'Messages',
        'Modal',
        'TEMPLATE_PATH',
        '$filter',
        'Group',
        '$log',
        'locationUtilService',
        'penpalService',
        function($scope, $rootScope, $location, InlineAlertService, Content, Messages, Modal,
            templatePath, $filter, Group, $log, locationUtilService, penpalService) {
            'use strict';

            $scope.getMessage = Messages.getMessage;

            Group.getAll().then(function(groups) {
                var classRoster = $scope.content;

                $scope.groups = groups;

                // sync/filter group's students with classRoster
                angular.forEach($scope.groups, function(group) {
                    group.$syncMembers(classRoster);
                });

                $scope.$emit('$dataLoaded');

            }, function(err) {
                $log.log('error getting groups!', err);
            });

            $scope.getStudentCount = function(group) {
                var classRoster = $scope.content,
                    students = $.Enumerable.From(group.$getMembers(classRoster.classId).students);

                return students.Count();
            };

            // Popover For Student Count Badge
            $scope.studentPopover = function(group) {
                var classRoster = $scope.content;

                // Add first 10 students to the list
                var students = $.Enumerable.From(group.$getMembers(classRoster.classId).students),
                    names = students.Select('$.lastFirst').ToArray().sort(),
                    list = names.slice(0, 10).join('<br>'),
                    remaining = students.Count() - 10,
                    message = '<br><i>' + Messages.getMessage('studentList.groups.sidebar.moreCount') + '</i>';

                message = (remaining > 0) ? $filter('replace')(message, remaining) : '';

                return list.length > 0 ? (list + message) :
                    Messages.getMessage('studentList.groups.sidebar.zeroState.message');
            };

            // Student List Modal
            $scope.studentList = function(e, group) {
                if (e) {
                    e.preventDefault();
                    e.stopPropagation();
                }

                var modalScope = $scope.$new();
                modalScope.students = group.$getMembers($scope.content.classId).students;
                modalScope.isPopupOpen = false;

                var onClose = function() {
                    modalScope.$destroy();
                };

                modalScope.done = function() {
                    Modal.hideDialog();
                    onClose();
                };

                Modal.showDialog('templates/partials/groups_student_list.html', modalScope);
            };

            $scope.hide = function(event) {
                event.stopPropagation();

                $scope.show = false;
            };

            // Create and Edit Group
            $scope.manageGroup = function(e, group) {
                if (e) {
                    e.preventDefault();
                    e.stopPropagation();
                }

                var modalScope = $scope.$new(true);
                modalScope.isInProgress = false;
                modalScope.isEdited = false;

                window.addEventListener('message', function(event) {
                    if (event.data === 'SAVE_CHANGES') {
                        modalScope.isPopupOpen = true;
                        modalScope.isInProgress = true;
                        modalScope.save();
                    }
                });

                var sendPenpalEvent = function(action, payload) {
                    if (locationUtilService.isDeeplinkStudentAndGroupTabActive()) {
                        penpalService.connectToParent().then(function(connection) {
                            connection.parent.exec(action, payload);
                        });
                    }
                };

                var onClose = function() {
                    var payload = { hasUnsavedChanges: false };
                    sendPenpalEvent('UNSAVED_CHANGES', payload);
                    modalScope.isEdited = false;
                    modalScope.$destroy();
                };

                modalScope.cancel = function() {
                    var payload = { hasUnsavedChanges: false };
                    sendPenpalEvent('UNSAVED_CHANGES', payload);
                    Modal.hideDialog();
                    onClose();
                };

                modalScope.readyToSave = function() {
                    return !modalScope.isInProgress && !modalScope.createGroupForm.$invalid &&
                        !modalScope.createGroupForm.name.$pristine;
                };

                modalScope.$watch('createGroupForm.$dirty', function(value) {
                    modalScope.isEdited = value;
                    if (value && modalScope.createGroupForm.$valid) {
                        var payload = { hasUnsavedChanges: true };
                        sendPenpalEvent('UNSAVED_CHANGES', payload);
                    }
                });

                modalScope.$watch('createGroupForm.$valid', function() {
                    if (modalScope.isEdited && modalScope.createGroupForm.$valid) {
                        var payload = { hasUnsavedChanges: true };
                        sendPenpalEvent('UNSAVED_CHANGES', payload);
                    }
                });

                modalScope.$watch('createGroupForm.$invalid', function() {
                    if (modalScope.isEdited && modalScope.createGroupForm.$invalid) {
                        var payload = { hasUnsavedChanges: false };
                        sendPenpalEvent('UNSAVED_CHANGES', payload);
                    }
                });

                window.addEventListener('message', function(event) {
                    if (event.data === 'SAVE_CHANGES') {
                        modalScope.isPopupOpen = true;
                        modalScope.isInProgress = true;
                        modalScope.save();
                    }
                });

                modalScope.save = function() {
                    modalScope.isInProgress = true;
                    modalScope.group.$save()
                        .then(function() {
                            var action = 'groupUpdated';
                            if (!modalScope.isEditing) {
                                $scope.groups.push(angular.copy(modalScope.group));
                                action = 'groupCreated';
                            } else {
                                // update the real group
                                angular.copy(modalScope.group, group);
                            }

                            var payload = { hasUnsavedChanges: false };
                            sendPenpalEvent('UNSAVED_CHANGES', payload);
                            sendPenpalEvent('CHANGES_SAVED', {});
                            modalScope.isEdited = false;
                            Modal.hideDialog();

                            InlineAlertService.addAlert(
                                modalScope.group.id,
                                {
                                    type: 'success',
                                    msg:[
                                        '<strong>',
                                        Messages.getMessage(
                                            'studentList.groups.manage.successNotification.' + action + '.title'
                                        ),
                                        '</strong> ',
                                        Messages.getMessage(
                                            'studentList.groups.manage.successNotification.' + action + '.message'
                                        )
                                    ].join('')
                                }
                            );
                            onClose();
                        }, function() {
                            // handle errors within modal?
                        });
                };

                if (angular.isDefined(group)) {
                    modalScope.isEditing = true;
                    // copy it so we dont modify if they cancel
                    modalScope.group = angular.copy(group);
                } else {
                    modalScope.isEditing = false;
                    modalScope.group = new Group();
                }

                // either way use dynamic classId (content for this modal should be ClassRoster oject)
                modalScope.group.classId = $scope.content.classId;

                Modal.showDialog('templates/partials/groups_manage.html', modalScope);
            };

            // Manage Students in Group
            $scope.manageGroupStudents = function(e, group) {
                // Tell the sidebar
                $scope.manageStudentsMode = true;
                $scope.managingGroupId = group.id;

                // Tell the student list
                $scope.$emit('manageStudentsMode', group);
            };

            var exitManageStudents = function() {
                $scope.manageStudentsMode = false;
            };

            // Cancel Manage Students Mode
            $scope.$on('manageStudentsCanceled', exitManageStudents);
            $scope.$on('manageStudentsCompleted', exitManageStudents);
        }
    ]);
