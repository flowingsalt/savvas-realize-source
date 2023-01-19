angular.module('RealizeApp')
    .controller('ClassWizCtrl', [
        '$q',
        '$scope',
        'ClassRoster',
        'User',
        '$log',
        '$window',
        '$debounce',
        'Modal',
        '$timeout',
        '$rootScope',
        '$location',
        'AlertService',
        'UnsavedChangesModal',
        'lwcI18nFilter',
        'MediaQuery',
        'Analytics',
        'featureManagementService',
        function($q, $scope, ClassRoster, User, $log, $window, $debounce, Modal, $timeout, $rootScope,
                 $location, AlertService, UnsavedChangesModal, lwcI18nFilter, MediaQuery, Analytics,
                 featureManagementService) {
            'use strict';

            // moved from app.js
            var moveArrayItem = function(arr, oldIndex, newIndex) {
                while (oldIndex < 0) {
                    oldIndex += arr.length;
                }
                while (newIndex < 0) {
                    newIndex += arr.length;
                }
                if (newIndex >= arr.length) {
                    var k = newIndex - arr.length;
                    while ((k--) + 1) {
                        arr.push(undefined);
                    }
                }
                arr.splice(newIndex, 0, arr.splice(oldIndex, 1)[0]);

                return arr;
            };

            /**
             * @property showStudentTips
             * @type {boolean}
             */
            $scope.showStudentTips = true;
            $scope.isDemoUser = $rootScope.currentUser.getAttribute('isSelfRegUser');
            $scope.hideBackButton = false;
            if (featureManagementService.isShowClassesTopnavEnabled()) {
                $scope.hideBackButton = true;
            }

            /**
             * @property activeClass
             * @type {number}
             */
            $scope.activeClass = 0;

            /**
             * @property isCheckForUnsavedChanges
             * @type {boolean}
             * Required to discard/save unsaved changed.
             */
            $scope.isCheckForUnsavedChanges = true;

            /**
             * @property globalClassSettings
             * @type {Object}
             * global settings to share across different class forms
             */
            $scope.globalClassSettings = {
                hidePassword: false,
                programLimit: 8,
                isAttemptSave: false
            };

            /**
             * @property classes
             * @type {Array}
             * start with one fresh class roster item
             * Required to discard/save unsaved changed.
             */
            $scope.classes = [];

            /**
             * @property progressPercent
             * @type {Integer}
             * saving progress?
             * Required to discard/save unsaved changed.
             */
            $scope.progressPercent = 0;

            /**
             * @property rosterThumbs
             * @type {Array}
             */
            $scope.rosterThumbs = $.Enumerable.From(ClassRoster.thumbnailBank)
                .Select('a => {caption: a.caption, image: a.image, url: \'' +
                    ClassRoster.thumbnailRoot + '\' + a.image}')
                .ToArray();

            /**
             * @property numRows
             * @type {Integer}
             * create the default for the add more rows value
             */
            $scope.numRows = 1;

            var isSaveRequestFromModal = false;

            /* ============ METHODS ============ */

            /**
             * @method setMaxVisible
             * @private
             */
            var setMaxVisible = function() {
                $scope.maxVisible = !MediaQuery.breakpoint.isDesktop ? 3 : 4;
            };

            /**
             * @method forceFormValidation
             * @private
             * @param {Object} formObj
             * run through each field and force it to update and populate its pristing/valid values
             */
            var forceFormValidation = function(formObj) {
                var field;
                for (field in formObj) {
                    if (formObj.hasOwnProperty(field)) {
                        if (field[0] !== '$' && formObj[field].$pristine) {
                            formObj[field].$setViewValue(
                                formObj[field].$modelValue
                            );
                        }
                    }
                }
            };

            /**
             * @method getNewClassRoster
             * @private
             * @param {Integer} orgIndex
             * @param {Integer} studentCount
             * @returns {ClassRoster}
             */
            var getNewClassRoster = function(orgIndex, studentCount) {
                var i,
                    orgId = $scope.currentUser.oleAffiliations[orgIndex].organizationId,
                    thisRoster = new ClassRoster({
                        detailsValid: false,
                        orgIndex: orgIndex,
                        organizationId: orgId,
                        // need this default to link up to check boxes
                        productIds: [],
                        // this is not persisted to DB as full objects, just IDs are, this is for the working set
                        students: [],
                        learningExperience: 'Standard'
                    });
                for (i = 0; i < studentCount; i++) {
                    thisRoster.students.push(new User({
                        organizationId: orgId
                    }));
                }
                return thisRoster;
            };

            /**
             * @method addNewRoster
             * @private
             * add new roster
             */
            var addNewRoster = function() {
                $scope.rosterCompleteSuccess = false;
                $scope.rosterUpdateSuccess = false;
                $scope.rosterError = false;
                $scope.rosterIncompleteError = false;

                // reset student rows and create a new class roster
                var newClassRoster = getNewClassRoster(0, 10);
                $scope.classes.push(newClassRoster);

                // choose new one
                $scope.selectTab(null, $scope.classes.length - 1);

                // reset saved flag
                $scope.globalClassSettings.isAttemptSave = false;
            };

            /**
             * @method getCurrentClass
             * @private
             * @returns {Array}
             */
            var getCurrentClass = function() {
                return $scope.classes[$scope.activeClass] || [];
            };

            /**
             * @method selectTab
             * @param {Event} e
             * @param {Integer} index
             * open a class tab
             * Required to discard/save unsaved changed.
             */
            $scope.selectTab = function(e, index) {
                if (e) {
                    e.preventDefault();
                    e.stopPropagation();
                }

                // if this tab is outside the range of visible tabs, we must reorder
                if (index > ($scope.maxVisible - 1)) {
                    moveArrayItem($scope.classes, index, $scope.maxVisible - 1);
                    $scope.activeClass = $scope.maxVisible - 1;
                } else {
                    $scope.activeClass = index;
                }
            };

            /**
             * @method setProgress
             * @param {Number} percent
             */
            $scope.setProgress = function(percent) {
                $scope.progressPercent = percent;
            };

            /**
             * @method newStudentsErrors
             * @param {Array} students
             * @returns {Boolean}
             */
            $scope.newStudentsErrors = function(students) {
                var userNames = [],
                    errorType = false;

                $.each(students, function(idx, s) {
                    if (s.userName !== '') {
                        if (_.contains(userNames, s.userName)) {
                            errorType = 'usernameDup';
                            return errorType;
                        }
                        userNames.push(s.userName);
                    }
                });
                return errorType;
            };

            /**
             * @method isCurrentClassDetailsInvalid
             * @returns {Boolean}
             * helper methods to determining form status for class details
             */
            $scope.isCurrentClassDetailsInvalid = function() {
                var currentClass = getCurrentClass();
                return currentClass && currentClass.detailsForm ? currentClass.detailsForm.$invalid : false;
            };

            /**
             * @method isCurrentClassDetailsDirty
             * @returns {Boolean}
             * Required to discard/save unsaved changed.
             */
            $scope.isCurrentClassDetailsDirty = function() {
                var currentClass = getCurrentClass();
                return currentClass && currentClass.detailsForm ? currentClass.detailsForm.$dirty : false;
            };

            /**
             * @method isCurrentClassDetailsPristine
             * @returns {Boolean}
             */
            $scope.isCurrentClassDetailsPristine = function() {
                var currentClass = getCurrentClass();
                return currentClass && currentClass.detailsForm ? currentClass.detailsForm.$pristine : false;
            };

            /**
             * @method isCurrentClassStudentsDirty
             * @returns {Boolean}
             * Required to discard/save unsaved changed.
             */
            $scope.isCurrentClassStudentsDirty = function() {
                var isDirty = false;
                _.each($scope.classes, function(thisClass) {
                    _.each(thisClass.students, function(student) {
                        if (student.$form.$dirty) {
                            isDirty = true;
                        }
                    });
                });
                return isDirty;
            };

            var isValidStudentRow = function(student) {
                return student.firstName &&
                    student.lastName &&
                    student.userName &&
                    student.password;
            };

            var prefix = 'createClass.successNotification.classCreated.';
            var realizeTeacherMessage = '<strong>' + lwcI18nFilter(prefix + 'title') + '</strong> ' +
                lwcI18nFilter(prefix + 'message');
            var realizeDemoTeacherMessage = '<strong>' + lwcI18nFilter(prefix + 'demoUser.Message.success') +
                '</strong>' + lwcI18nFilter(prefix + 'demoUser.Message.messageBody1') + '<strong>' +
                lwcI18nFilter(prefix + 'demoUser.Message.studentAndGroups') +
                '</strong>' + lwcI18nFilter(prefix + 'demoUser.Message.messageBody2');

            /**
             * @method saveSuccess
             */
            $scope.saveSuccess = function() {

                var numOfStudentsAdded = _.filter($scope.classes[0].students, function(student) {
                    return student.fullName.length > 1;
                }).length;

                var successAlertMessage = ($scope.isDemoUser && numOfStudentsAdded > 0) ?
                    realizeDemoTeacherMessage : realizeTeacherMessage;
                AlertService.addAlert('success', 'ok-sign', successAlertMessage);
                $scope.isCheckForUnsavedChanges = false;
                if (!isSaveRequestFromModal) {
                    $location.path('/classes');
                }
            };

            $scope.updateAriaExpandValue = function() {
                var ariaExpandedValue = false;
                if ($scope.showStudentTips) {
                    ariaExpandedValue = true;
                }
                return ariaExpandedValue;
            };
            /**
             * @method saveRoster
             * @returns {Object} - promise
             * click the save button
             */
            $scope.saveRoster = function() {

                $scope.globalClassSettings.isAttemptSave = true;

                // reset completion vars
                $scope.rosterCompleteSuccess = false;
                $scope.rosterUpdateSuccess = false;
                $scope.rosterError = false;
                $scope.rosterIncompleteError = false;

                $scope.pageLoaded();

                var roster = getCurrentClass();
                Analytics.track('track.action', {
                    category: 'Classes',
                    action: 'Choose Theme',
                    label: roster.learningExperience,
                });

                // this just verifies that the top portion of the form is valid, not the student list
                if ($scope.isCurrentClassDetailsInvalid()) {
                    // check to see if the class name is not set
                    if (!getCurrentClass().className) {
                        $timeout(function() {
                            $('html, body').animate({
                                scrollTop: 0
                            }, 'fast');
                        }, 300);
                    }
                    return $q.reject('form is invalid!');
                }

                if (getCurrentClass().productIds.length < 1) {
                    $scope.programError = true;
                    return $q.reject('form is invalid!');
                }

                // now let's check if we have any invalid students
                var invalidStudents = _.filter(roster.students, function(student) {
                    var isValidRumbaUser = (student.password === 'password not shown'); //HACK!
                    return (student.$form && student.$form.$dirty &&
                        //$invalid not getting updated after angular 1.3, but $error is.
                        Object.keys(student.$form.$error).length > 0) && !isValidRumbaUser;
                });

                if (invalidStudents.length > 0) {

                    // force all rows to be dirty and invalid
                    angular.forEach(invalidStudents, function(student) {
                        forceFormValidation(student.$form);
                    });

                    $scope.rosterIncompleteError = true;
                    return $q.reject('form is invalid!');
                }

                // get the actual students out of the table, as some might be blank rows
                var studentsToSave = _.filter(roster.students, function(student) {
                    var isValidRumbaUser = (student.password === 'password not shown'); //HACK!
                    var isAttemptedNewStudent = student.$form && student.$form.$dirty && student.$form.$valid;
                    return (isAttemptedNewStudent || isValidRumbaUser) && !student.addedToRoster;
                });

                // set mode var for correct messaging
                var editMode = !!(roster.classId && roster.classId.length > 0);

                // setup the save progress modal
                $scope.setProgress(0);

                $scope.saveIncrement = 100 / (studentsToSave.length + 1);
                //$log.log('Adding ' + studentsToSave.length + ' students and 1 roster. Increment size is: ' +
                // $scope.saveIncrement, studentsToSave);

                var progressText = {
                    updatingTitle: lwcI18nFilter('createClass.updatingProgress.title'),
                    savingTitle: lwcI18nFilter('createClass.savingProgress.title'),
                    updatingMsg: lwcI18nFilter('createClass.updatingProgress.message'),
                    savingMsg: lwcI18nFilter('createClass.savingProgress.message')
                };

                var progressModal = Modal.progressDialog($scope.$new(), {
                    progressHeader: (editMode) ? progressText.updatingTitle : progressText.savingTitle,
                    progressMessage: (editMode) ? progressText.updatingMsg : progressText.savingMsg
                }).then(function() {
                    if (studentsToSave.length === 0) {
                        progressModal.fakeProgress();
                    }
                });

                // get rid of empty productIds
                $.each(roster.productIds, function(index, id) {
                    if (!id) {
                        roster.productIds.splice(index, 1);
                    }
                });

                var setupSuccess = function(deferred) {
                    if (editMode) {
                        $scope.rosterUpdateSuccess = true;
                    } else {
                        $scope.rosterCompleteSuccess = true;
                    }
                    if (featureManagementService.isShowClassesTopnavEnabled()) {
                        sessionStorage.setItem('realize.new.class.created', true);
                        $window.location.href = $window.location.protocol +
                                    '//' + $window.location.hostname + '/dashboard/viewer';
                    }
                    //progressComplete doesn't return a real promise
                    // this 'then' function gets called after a timeout completes
                    progressModal.progressComplete().then(function() {
                        $timeout(function() {
                            Modal.hideDialog();
                        }, 500).
                        finally(function() {
                            $timeout(function() {
                                $scope.saveSuccess();
                            }, 800).
                            finally(function() {
                                deferred.resolve(true);
                            });
                        });
                    });
                };

                // save this roster as a new one
                var deferred = $q.defer();
                roster.$save(function() {
                    // update currentUser if necessary
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

                    // then save students
                    if (studentsToSave.length > 0) {
                        $scope.addStudentsToRoster(studentsToSave, roster)
                            .then(function() {
                                setupSuccess(deferred);
                            }, function(err) {
                                $scope.rosterError = true;
                                progressModal.then(function() {
                                    $timeout(function() {
                                        Modal.hideDialog();
                                        deferred.reject(err);
                                    }, 500);
                                });
                            });
                    } else {
                        setupSuccess(deferred);
                    }
                }, function(err) {
                    $timeout(function() {
                        Modal.hideDialog();
                    }, 1000);
                    $log.error('class roster save error:', err);
                    deferred.reject(err);
                });

                return deferred.promise;
            };

            /**
             * @method addRoster
             * @param {Event} e
             * click the add tab button
             */
            $scope.addRoster = function(e) {
                e.preventDefault();
                e.stopPropagation();

                // todo: validate & save open one...
                if ($scope.progressPercent === 100) {
                    $scope.setProgress(0);
                    addNewRoster();
                } else if (!$scope.isCurrentClassDetailsPristine()) {
                    var modalScope = $scope.$new();
                    modalScope.delegate = {
                        close: function() {
                            Modal.hideDialog();
                        },
                        discard: function() {
                            Modal.hideDialog();
                            addNewRoster();
                        },
                        save: function() {
                            Modal.hideDialog();
                            if (!angular.isDefined(getCurrentClass().classId)) {
                                $scope.saveRoster().then(addNewRoster);
                            } else {
                                addNewRoster();
                            }
                        }
                    };

                    Modal.showDialog('templates/partials/unsaved_edit_dialog.html', modalScope);
                } else {
                    $log.warn('addRoster, form invalid, cannot add (not dirty)', $scope.createClassForm);
                }
            };

            /**
             * @method addStudentRows
             * @param {Event} e
             * @param {Integer} numRows
             * add sum rows
             */
            $scope.addStudentRows = function(e, numRows) {
                var i,
                    defaultUserName = $scope.isDemoUser ? lwcI18nFilter('demo.autoGenerate.username.placeHolder') : '',
                    currentClass = getCurrentClass();
                for (i = 0; i < numRows; i++) {
                    currentClass.students.push(new User({
                        organizationId: currentClass.organizationId,
                        userName: defaultUserName
                    }));
                }
            };

            /**
             * @method addStudentsToRoster
             * @param {Array} students
             * @param {Object} roster
             * @returns Promise
             */
            $scope.addStudentsToRoster = function(students, roster) {
                var deferred = $q.defer(),
                    innerDeferred = $q.defer();

                var studentsToAdd = [],
                    rumbaErrors = false,
                    usersToCreateCount = 0,
                    studentsToCreate = [];

                var markStudentsAsAdded = function(studentIdList) {
                    angular.forEach(studentIdList, function(userId) {
                        angular.forEach(roster.students, function(student) {
                            if (student.userId === userId) {
                                student.addedToRoster = true;
                                student.disableEdits = true;
                            }
                        });
                    });
                };

                //determine # of new students for innerDeferred countdown
                angular.forEach(students, function(student) {
                    // skip empty rows
                    if (isValidStudentRow(student)) {
                        if (!student.userId) {
                            studentsToCreate.push(student);
                            ++usersToCreateCount;
                        } else {
                            $scope.setProgress(Math.floor($scope.progressPercent + $scope.saveIncrement));
                            studentsToAdd.push(student.userId);
                        }
                    }
                });

                angular.forEach(studentsToCreate, function(student) {
                    // reset server errors
                    student.serverErrors = [];

                    // if a new student, add to Rumba first
                    student.$create().then(function() {
                        var userID = (student.userId) ? student.userId : student.data.userId;
                        studentsToAdd.push(userID);
                    }).catch(function(response) {
                        rumbaErrors = true;
                        // response.data will contain the student sometimes?
                        if (response.data) {
                            $.extend(student, response.data); // don't blow away other stuff...
                            studentsToAdd.push(student.userId);
                        }

                        var errorMap = {
                            'ULC0003W': lwcI18nFilter('global.studentUser.error.rumbaUserExists')
                        };

                        student.serverErrors.push({
                            code: response.errorCode,
                            message: response.errorMessage,
                            uimessage: errorMap[response.errorCode] || response.errorMessage
                        });

                    }).finally(function() {
                        // increment the progress bar
                        $scope.setProgress(Math.floor($scope.progressPercent + $scope.saveIncrement));
                        // we're done with RUMBA, decrease the count and possibly continue
                        usersToCreateCount--;
                        if (usersToCreateCount <= 0) {
                            innerDeferred.resolve(true);
                        }
                    });
                });

                // the inner deferred will actually try to add them to the roster
                innerDeferred.promise.then(function() {
                    // actually adding to roster is the final step
                    roster.$addStudents(studentsToAdd)
                        .then(function() {
                            // even tho we are successful at adding students to the class, there were some other errors
                            // so we'll reject this whole operation
                            if (rumbaErrors) {
                                deferred.reject(studentsToAdd);
                            } else {

                                // flag each student as added so we don't have to add them again
                                markStudentsAsAdded(studentsToAdd);

                                // resolve the main deferred so we know we're done
                                deferred.resolve(studentsToAdd);
                            }
                            // increment the progress bar to 100%
                            $scope.setProgress(100);
                        }, function(response) {
                            deferred.reject(response);
                            // increment the progress bar to 100%
                            $scope.setProgress(100);
                        });
                });

                // if we've hit this spot and don't have any RUMBA, we're already done.
                if (usersToCreateCount <= 0) {
                    innerDeferred.resolve(true);
                }

                return deferred.promise;
            };

            /*============ LISTENERS ============*/

            /**
             * @listener window.breakpoint.change
             * Watch for responsive changes to update the tabs
             * Required to discard/save unsaved changed.
             */
            $scope.$on('window.breakpoint.change', function() {
                setMaxVisible();
                $scope.selectTab(null, $scope.activeClass);
            });

            /**
             * @listener class-roster-programs.productIdsChanged
             * @param {Event} e
             * @param {Object} changedClass
             */
            $scope.$on('class-roster-programs.productIdsChanged', function(e, changedClass) {
                $scope.programError = false;
                changedClass.detailsForm.$setDirty();
            });

            var unsavedChangesModal = new UnsavedChangesModal(function() {
                isSaveRequestFromModal = true;
                return $scope.saveRoster();
            });

            /**
             * @listener $locationChangeStart
             * @param {Event} event
             * @param {String} next
             * @param {String} current
             */
            var listenerDestroy = $rootScope.$on('$locationChangeStart', function(event) {
                var cleanupClasses = function() {
                    angular.forEach($scope.classes, function(roster) {
                        roster.$clearCache();
                    });
                    $scope.classes = [];
                };

                // TODO: Why the detailsDirty and progressPercent?
                if ($scope.isCheckForUnsavedChanges && ($scope.isCurrentClassStudentsDirty() ||
                    ($scope.isCurrentClassDetailsDirty() && $scope.progressPercent !== 100))) {

                    unsavedChangesModal.showDialog(event).then(function() {
                        $scope.isCheckForUnsavedChanges = false;
                        cleanupClasses();
                        $scope.wizardDirty = false;
                    }, function() {
                            $rootScope.viewLoading = false;
                        });
                } else {
                    cleanupClasses();
                }
            });

            $scope.$on('$destroy', function() {
                listenerDestroy();
            });

            /**
             * @method closeFirstVisitInfo
             */
            $scope.closeFirstVisitInfo = function() {
                $scope.currentUser.setAttribute('classes.info.seen', true, true);
            };

            /* ============ ONLOAD ============ */

            /**
             * @method init
             * @private
             */
            var init = function() {
                $rootScope.pageLoading();

                $timeout(function() {
                    setMaxVisible();

                    // TODO: why push() ??
                    $scope.classes.push();
                    addNewRoster();
                    $rootScope.pageLoaded();
                }, 10);

            };

            init();

        }
    ]);
