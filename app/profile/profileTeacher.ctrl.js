angular.module('Realize.teacher.profile', [
        'Realize.constants.stateCode',
        'Realize.user.currentUser',
        'Realize.common.optionalFeaturesService',
        'Realize.constants.googleClassroom',
        'Realize.constants.profileTeacherConstants',
        'rlzComponents.components.googleClassroom.constants',
        'rlzComponents.components.telemetryService',
        'rlzComponents.components.telemetry.constants'
        ])
    .controller('TeacherProfileCtrl', [
        '$scope',
        'Permissions',
        '$location',
        'OptionalFeatures',
        '$anchorScroll',
        '$filter',
        'PATH',
        '$http',
        'Modal',
        '$log',
        '$rootScope',
        'User',
        'lwcI18nFilter',
        'RealizeHelpers',
        'ROOT_PATH',
        'FormService',
        '$cacheFactory',
        'REST_PATH',
        'UnsavedChangesModal',
        '$currentUser',
        'BrowserInfo',
        'Standard',
        'STATE_CODE',
        'GOOGLE_CLASSROOM',
        'googleClassroomService',
        'googleClassroomUtils',
        'GoogleClassroomConstants',
        'featureManagementService',
        'ProfileUserMapping',
        'PROFILE_TEACHER',
        'telemetryService',
        'baseTelemetryEvents',
        'TELEMETRY_CONSTANTS',
        'standardModal',
        'disconnectModal',
        function($scope, Permissions, $location, OptionalFeatures, $anchorScroll, $filter, PATH, $http, Modal, $log,
                 $rootScope, User, lwcI18nFilter, RealizeHelpers, rootPath, FormService, $cacheFactory, restPath,
                 UnsavedChangesModal, $currentUser, BrowserInfo, Standard, stateCodes, GOOGLE_CLASSROOM,
                 googleClassroomService, googleClassroomUtils, GoogleClassroomConstants, featureManagementService,
                 ProfileUserMapping, PROFILE_TEACHER, telemetryService, baseTelemetryEvents, TELEMETRY_CONSTANTS,
                 standardModal, disconnectModal) {
            'use strict';
            $scope.stepsVisited = {};
            $scope.availableStates = stateCodes;
            var isProgramtabClicked = false;
            $scope.googleClassroomHelpUrlInstructor = window.googleClassroomHelpUrlInstructor;
            $scope.showGoogleClassroomIntegration = function() {
                return $currentUser.isTeacher && featureManagementService.isGoogleClassroomEnabled() &&
                    !$currentUser.isLtiAUser;
            };
            $scope.isGCAutoPlusTeacherWithClassLinkingEnabled = function() {
                return $scope.showGoogleClassroomIntegration() && $currentUser.getAttribute('isAutoRostered') &&
                $currentUser.getAttribute('isClassLinkingEnabled');
            };
            $scope.googleClassroomText = {
                yourGoogleClassroomAccount: lwcI18nFilter('teacherHome.yourGoogleClassroomAccount'),
                connectedToRealize: lwcI18nFilter('teacherHome.connectedToRealize'),
                googleClassroomConnect1: lwcI18nFilter('teacherHome.googleClassroomConnect1'),
                googleClassroomConnect2: lwcI18nFilter('teacherHome.googleClassroomConnect2'),
                connectMoreGoogleClasses: lwcI18nFilter('teacherHome.connectMoreGoogleClasses'),
                getStarted: lwcI18nFilter('teacherHome.getStarted')
            };

            $scope.getUserLinkedStatus = function() {
                if (ProfileUserMapping && ProfileUserMapping.data) {
                    var userMapping = ProfileUserMapping.data.userMapping;
                    var isGoogleClassroomEnabled = featureManagementService.isGoogleClassroomEnabled();
                    if (isGoogleClassroomEnabled && userMapping) {
                        $scope.isUserLinked = userMapping.linked;
                        $scope.googleClassroomEmailAddress = userMapping.email || '';
                        $scope.showDisconnect = userMapping.linked;
                    }
                }
            };

            $scope.getUserLinkedStatus();

            $scope.isActiveStep = function(index) {
                // if we haven't scrolled yet, select first one
                if (!$scope.stepSpy || index >= $scope.stepSpy.length) {
                    return index === 0;
                }

                var top = $scope.stepSpy[index].top,
                    active;
                var isScrolledToBottom = RealizeHelpers.isElementScrolledToBottom($('#steps'), 20);

                // get size of this step and the next
                if (index === $scope.stepSpy.length - 1) { // last one
                    //$log.log('step index',index, 'top', top, 'size', size * -1);
                    active = top <= 57 || isScrolledToBottom;
                } else if (!isScrolledToBottom) {
                    var size = $scope.stepSpy[index + 1].top - top;
                    //$log.log('step index',index, 'top', top, 'size', size * -1);
                    active = top <= (index === 0 ? 0 : 57) && top >= (size - 57) * -1;
                }

                if (active && !_.has($scope.stepsVisited, index)) {
                    $scope.stepsVisited[index] = true;
                    $scope.stepsVisited.last = index;
                }

                return active;
            };

            $scope.availablePrograms = [];
            var p,
                subscribed = $scope.currentUser.subscribedCourses;
            for (p = 0; p < $scope.currentUser.availableCourses.length; p++) {
                var course = $scope.currentUser.availableCourses[p];
                $scope.availablePrograms.push({
                    name: course,
                    checked: $.inArray(course, subscribed) >= 0,
                    disabled: $.inArray(course, subscribed) >= 0
                });
            }
            var getSelectedPrograms = function() {
                var selected = $filter('filter')($scope.availablePrograms, {
                    checked: true
                });
                selected = $.Enumerable.From(selected).Select('$.name').ToArray();
                if ($scope.programDirty === false && selected.length > 0) {
                    $scope.programDirty = true;
                }

                return selected;
            };
            var getStandardsStateDescriptionDetails = function() {
                //spinner is needed only specific to this call as it takes longer time to load the data from backend
                $rootScope.viewLoading = true;
                Standard.getStandardsStateDetails(getSelectedPrograms())
                    .then(function(response) {
                        $scope.standardsData = response;
                        $rootScope.viewLoading = false;
                    });
            };
            var telemetryVerb = {};
            var telemetryObject = {};

            $scope.$watch('availablePrograms', function() {
                // the settings page should already be incapable of zero
                if ($scope.wizardForm) {
                    $scope.wizardForm.$setValidity('programs', getSelectedPrograms().length > 0);
                }
            }, true);

            $scope.firstName = $currentUser.firstName;
            $scope.middleName = $currentUser.getAttribute('profile.middleName');
            $scope.lastName = $currentUser.lastName;
            $scope.email = $currentUser.rumbaEmail;
            $scope.facingName = $currentUser.getAttribute('profile.displayName');
            $scope.username = $currentUser.userName;
            $scope.selectedBG = $currentUser.getAttribute('home.background') || 'teacher1';
            $scope.announcements = $currentUser.getAttribute('profile.announcements');

            $scope.hasPermission = Permissions.hasPermission;

            $scope.federatedSettingAlert = {
                showAlert: true,
                getTitle: function() {
                    return lwcI18nFilter('federatedUser.teacherSettings.alert.title');
                },
                getDescription: function() {
                    return lwcI18nFilter('federatedUser.teacherSettings.alert.description');
                },
                closeFn: function() {
                    $scope.federatedSettingAlert.showAlert = false;
                }
            };
            // there are currently 18 icons
            $scope.profileIcons = [];

            // default (store only first part so that we can display retina later)
            $scope.selectedProfileIcon = $currentUser.getAttribute('profile.avatar') || '01_teacher';

            // todo: make this a constant?
            var profilePath = PATH.IMAGES + '/profile_icons/';
            var bgBasePath = PATH.SHARED_THUMBNAILS + '/homepage/settings/';

            var Icon = function(name, basePath, filename, ext) {
                this.name = name;
                this.basePath = basePath;
                this.filename = filename;
                this.fileExt = ext;
            };
            Icon.prototype.getPath = function() {
                return [this.basePath, this.filename, BrowserInfo.isHDDisplay ? '@2x' : '', this.fileExt].join('');
            };

            // profile icons
            var i, num;
            for (i = 1; i < 19; i++) {
                // they have double digit names....
                num = i.toString();
                if (num.length < 2) {
                    num = '0' + num;
                }
                $scope.profileIcons.push(new Icon(num + '_teacher', profilePath, num + '_teacher', '.png'));
            }

            // make a copy of the current user for editing "undo"
            $scope.editUser = angular.copy($currentUser);
            /**
             * TODO : Check and remove this conversion of middle name to string after angular update to 1.3
             * The following link is the reference to the bug that is being logged
             * https://github.com/angular/angular.js/issues/7848
             */
            if ($scope.editUser.middleName) {
                $scope.editUser.middleName = $scope.editUser.middleName.toString();
            }

            $scope.selectedLanguage = 'English';
            var curLocale = $scope.editUser.getAttribute('profile.locale');
            if (curLocale === 'es') {
                $scope.selectedLanguage = 'Spanish';
            }

            var curStateCode = $currentUser.getStateCode();
            if (curStateCode) {
                $scope.curState = curStateCode;
                var matchedState = _.find(stateCodes, function(state) {
                    return state.stateCode === curStateCode;
                });
                $scope.selectedStateCode = matchedState.stateName;
            }

            $scope.setStateCodeValues = function(stateCode, stateName) {
                $scope.curState = stateCode;
                $scope.selectedStateCode = stateName;
            };

            $scope.isAdminStateSpecificContentEnabled = function() {
                return $currentUser.hasRole('ROLE_LIBRARY_ADMIN');
            };

            $scope.bgImages = [];
            // background thumbs
            var t;
            for (t = 1; t < 13; t++) {
                $scope.bgImages.push(new Icon('teacher' + t, bgBasePath, 'teacher' + t, '.png'));
            }

            $scope.chooseProfileIcon = function(e, icon) {
                if (e) {
                    e.preventDefault();
                    e.stopPropagation();
                }

                $scope.selectedProfileIcon = icon.name;
            };

            $scope.grades = [];
            var resetGrades = function(userGrades) {
                var grades = [],
                    levels = [
                        'Pre-K', 'Kindergarten', 'Grade 1', 'Grade 2',
                        'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6',
                        'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10',
                        'Grade 11', 'Grade 12'
                    ];

                _.each(levels, function(grade) {
                    grades.push({
                        name: grade,
                        checked: $.inArray(grade, userGrades) >= 0
                    });
                });
                $scope.grades = grades;
            };
            resetGrades($currentUser.getAttribute('profile.grades'));

            // faux $dirty designator for grades checkboxes
            $scope.gradesDirty = false;

            var getSelectedGrades = function() {
                var selected = $filter('filter')($scope.grades, {
                    checked: true
                });
                selected = _.pluck(selected, 'name');
                if ($scope.gradesDirty === false && selected.length > 0) {
                    $scope.gradesDirty = true;
                }

                return selected;
            };

            $scope.$watch('grades', function() {
                if ($scope.wizardForm) {
                    $scope.wizardForm.$setValidity('grades', getSelectedGrades().length > 0);
                }
                if ($scope.aboutMeForm) {
                    $scope.aboutMeForm.$setValidity('grades', getSelectedGrades().length > 0);
                }
            }, true);

            $scope.scrollTo = function(id) {
                $location.hash(id);
            };

            $scope.setBackground = function(e, bg) {
                if (e) {
                    e.preventDefault();
                    e.stopPropagation();

                    $scope.selectedBG = bg;
                }
            };

            $scope.goButton = {
                isClicked: false,
                isErrored: false
            };

            $scope.closeAlertMsg = function() {
                $scope.goButton.isClicked = false;
                angular.element('#finishButton').focus();
            };

            var sendTelemetryEvent = function(verb, object) {
                var telemetryEventData;
                if (verb.description) {
                    telemetryEventData = baseTelemetryEvents.createEventDataWithDescription(verb.id,
                        verb.description, object);
                } else {
                    telemetryEventData = baseTelemetryEvents.createEventData(verb.id, object);
                }
                telemetryService.sendTelemetryEvent(telemetryEventData);
            };

            var selectedPrograms;
            var selectedProgramsCount;

            $scope.finish = function() {
                // validate
                $scope.wizardForm.$dirty = true;
                $scope.gradesDirty = true;
                $scope.wizardForm.$setValidity('grades', getSelectedGrades().length > 0);
                $scope.programsDirty = true;
                $scope.wizardForm.$setValidity('programs', getSelectedPrograms().length > 0);
                $scope.wizardForm.facingName.$dirty = true;
                $scope.wizardForm.agreement.$dirty = true;

                // jump to first error
                if ($scope.wizardForm.$error.grades) {
                    $scope.scrollTo('step1');
                    return;
                }

                if ($scope.wizardForm.$error.programs) {
                    $scope.scrollTo('step2');
                    return;
                }

                if ($scope.wizardForm.facingName.$invalid) {
                    $scope.scrollTo('step3');
                    return;
                }

                // agreement is next to the button, no need to scroll

                if ($scope.wizardForm.$valid) {
                    // save stuff
                    var attributes = {
                        'profile.avatar': $scope.selectedProfileIcon,
                        'home.background': $scope.selectedBG,
                        'profile.grades': angular.toJson(getSelectedGrades()),
                        'profile.displayName': $scope.facingName,
                        'profile.termsOfUse': $scope.agreement,
                        'profile.announcements': $scope.announcements,
                        'profile.wizard': 'complete'
                    },
                    doNotPersistAttrFlag = false;
                    $scope.goButton.isClicked = true;
                    User.updateCurrentUserAttributes(attributes)
                        .then(function() {
                            // call this api to set the avatarUrl property of current user that is used to display
                            // profile icon on home page
                            $currentUser.$setAvatar($scope.selectedProfileIcon, doNotPersistAttrFlag);
                            selectedPrograms = getSelectedPrograms();
                            selectedProgramsCount = selectedPrograms.length;
                            return $currentUser.updateProductSubscriptions(selectedPrograms);
                        }).then(function() {
                            return $currentUser.getAttribute('hasCenter', true);
                        }).then(function() {
                            // send to home, have to make sure subscribing is done first or home page won't load
                            telemetryVerb = {
                                id: TELEMETRY_CONSTANTS.EVENT_TYPE.OPEN,
                            };
                            telemetryObject = {
                                extensions: {
                                    page: PROFILE_TEACHER.TELEMETRY.WELCOME,
                                    value: selectedProgramsCount,
                                },
                                definition: {
                                    name: PROFILE_TEACHER.TELEMETRY.LETS_GO_BUTTON_CLICK_EVENT,
                                },
                            };
                            sendTelemetryEvent(telemetryVerb, telemetryObject);

                            $location.hash('');
                            $location.path('/dashboard');
                        }).catch(function(errorResponse) {
                            telemetryVerb = {
                                id: TELEMETRY_CONSTANTS.EVENT_TYPE.ERROR,
                                description: errorResponse.errorMessage,
                            };
                            telemetryObject = {
                                extensions: {
                                    page: PROFILE_TEACHER.TELEMETRY.WELCOME,
                                },
                                definition: {
                                    name: PROFILE_TEACHER.TELEMETRY.LETS_GO_BUTTON_CLICK_EVENT,
                                },
                            };
                            sendTelemetryEvent(telemetryVerb, telemetryObject);
                            $scope.goButton.isClicked = false;
                            $scope.goButton.isErrored = true;
                            $log.error('error', errorResponse);
                        });
                }
            };

            $scope.showLicenseAgreement = function(e) {
                if (e) {
                    e.preventDefault();
                    e.stopPropagation();
                }

                // just display, doesn't need any extra data
                $http.get(rootPath + '/prelogin/userAgreement.html', {
                        cache: true
                    })
                    .success(function(response) {
                        // because this is getting jammed inside a modal, grab only the meat
                        var contents = angular.element(response);
                        // kinda hacky but these links aren't really relative anymore
                        angular.forEach(contents.find('a'), function(link) {
                            var oldHref = angular.element(link).attr('href'),
                                knewtonLinkQualifier = 'knewton.com';
                            if (oldHref.indexOf(knewtonLinkQualifier) === -1) {
                                angular.element(link).attr('href', rootPath + '/prelogin/' + oldHref);
                            }
                        });
                        contents.find('a').attr('target', '_blank');
                        var body = contents.find('#content').html();
                        var modalScope = $scope.$new(true);
                        modalScope.title = 'End User License Agreement';
                        modalScope.body = body;
                        modalScope.closeBtnClickHandler = function() {
                            Modal.hideDialog();
                            modalScope.$destroy();
                        };
                        modalScope.buttons = [{
                            title: 'Close',
                            isDefault: true,
                            clickHandler: function() {
                                Modal.hideDialog();
                                modalScope.$destroy();
                            }
                        }];
                        Modal.showDialog('templates/partials/simpleDialog.html', modalScope);
                    });
            };

            $scope.showPreviewBG = function() {
                var shell;
                if (curLocale === 'es') {
                    shell = '<img src="' + PATH.IMAGES + '/homepage/preview/home_preview_teacher_spanish.png' +
                        '" class="previewBG" />';
                } else {
                    shell = '<img src="' + PATH.IMAGES + '/homepage/preview/home_preview_teacher.png' +
                        '" class="previewBG" />';
                }

                var preview = '<img src="' + PATH.SHARED_THUMBNAILS + '/homepage/preview/' + $scope.selectedBG +
                    (BrowserInfo.isHDDisplay ? '@2x.jpg' : '.jpg') + '" class="previewSM" />';

                var modalScope = $scope.$new(true);
                modalScope.dialogId = 'homeBGPreview';
                modalScope.title = lwcI18nFilter('teacherProfile.step5.preview.title');
                modalScope.body = preview + shell;
                modalScope.closeBtnClickHandler = function() {
                    Modal.hideDialog();
                    modalScope.$destroy();
                };
                modalScope.buttons = [{
                    title: 'OK',
                    isDefault: true,
                    clickHandler: function() {
                        Modal.hideDialog();
                        modalScope.$destroy();
                    }
                }];
                Modal.showDialog('templates/partials/simpleDialog.html', modalScope);
            };

            var unsavedChangesModal = new UnsavedChangesModal(function() {
                return $scope.save();
            });

            // main nav watch
            $scope.$on('$locationChangeStart', function(event) {
                var activeForm = $scope[$scope.activeTab + 'Form'];
                if (activeForm && activeForm.$dirty) {
                    unsavedChangesModal.showDialog(event).catch(function() {
                        $rootScope.viewLoading = false;
                    });
                }
            });

            // tab watch for settings
            $scope.showTab = function(tab) {
                if (tab === 'myPrograms' && !isProgramtabClicked) {
                    getStandardsStateDescriptionDetails();
                    isProgramtabClicked = true;
                }
                var activeForm = $scope[$scope.activeTab + 'Form'];
                if (activeForm && activeForm.$dirty) {
                    unsavedChangesModal.showDialog().then(function() {
                        $scope.reset();
                        $scope.activeTab = tab;
                        unsavedChangesModal.reset();
                    });
                } else {
                    $scope.activeTab = tab;
                }
                $scope.isAttemptSave = false;
            };
            // Set initial tab to show
            $scope.activeTab = 'account';

            $scope.redirectToRealizeSyncWebApp = function() {
                var name = $scope.isUserLinked ? GOOGLE_CLASSROOM.CONNECT_CLASS : GOOGLE_CLASSROOM.GET_STARTED;
                var description = $scope.isUserLinked ? GOOGLE_CLASSROOM.GOOGLE_CONNECT :
                    GOOGLE_CLASSROOM.GOOGLE_GET_STARTED;
                var getStartedTelemetryObject = {
                    extensions: {
                        area: GOOGLE_CLASSROOM.SETTINGS,
                        page: GOOGLE_CLASSROOM.ACCOUNT_LINKING,
                        product: GoogleClassroomConstants.EVENT_TYPE.PROGRAM_NOT_AVAILABLE,
                        description: description
                    },
                    definition: {
                        name: name,
                    },
                };
                googleClassroomService.redirectToRealizeSyncWebApp($location.absUrl(), GoogleClassroomConstants.LAUNCH,
                    getStartedTelemetryObject);
            };

            var saveProfile = function(success, fail) {
                var userAttr = {
                    'home.background': $scope.selectedBG,
                    'profile.grades': angular.toJson(getSelectedGrades()),
                    'profile.displayName': $scope.facingName
                };
                $scope.saveError = false;
                return $currentUser.$setAvatar($scope.selectedProfileIcon)
                    .then(function() {
                        return User.updateCurrentUserAttributes(userAttr);
                    })
                    .then(function() {
                        $scope.settingsSuccess = true;
                        $scope.reset();
                        success();
                        $rootScope.$emit('profile.avatar.updated');
                    })
                    .catch(function(errorResponse) {
                        $log.error('failed to upload user attributes', errorResponse);
                        $scope.saveError = true;
                        $scope.isInProgress = false;
                        fail();
                    });
            };

            $scope.save = function(success, fail) {
                var form = $scope[$scope.activeTab + 'Form'];
                success = success || angular.noop;
                fail = fail || angular.noop;
                $scope.settingsError = false;

                if (form && form.$valid) {
                    if ($scope.activeTab === 'account') {

                        var currentLocale = $currentUser.getLocale();
                        var selectedLocale = $scope.selectedLanguage === 'Spanish' ? 'es' : 'en';

                        //save in memory
                        var existingStateCode;
                        angular.extend($currentUser, $scope.editUser);
                        if ($scope.isAdminStateSpecificContentEnabled()) {
                            existingStateCode = $currentUser.getStateCode();
                            $currentUser.setStateCode($scope.curState);
                        }
                        $currentUser.$updateNames();
                        var firstNameUpdated;
                        if ($scope.firstName !== $currentUser.firstName || $scope.lastName !== $currentUser.lastName) {
                            firstNameUpdated = true;
                            $scope.firstName = $currentUser.firstName;
                            $scope.lastName = $currentUser.lastName;
                        }
                        // save edit user, copy over to real user
                        return $currentUser.$save().then(function() {
                            if (firstNameUpdated) {
                                $rootScope.$emit('profile.names.updated');
                            }
                            $scope.settingsSuccess = true;

                            if (currentLocale !== selectedLocale) {
                                $currentUser.$setLocale(selectedLocale);
                            }

                            $scope.reset();
                            success();
                            //if state code changed , remove cached program api , when clicked on program tab
                            //it will filter with updated state code.
                            if ($scope.isAdminStateSpecificContentEnabled() &&
                                    (existingStateCode !== $currentUser.getStateCode())) {
                                var allProgramsUrl = [restPath, 'programs'].join('/'),
                                    allCentersUrl = [restPath, 'centers'].join('/');
                                $cacheFactory.get('$http').remove(allProgramsUrl);
                                $cacheFactory.get('$http').remove(allCentersUrl);
                            }
                        }, function() {
                            // error
                            return;
                        });
                    }

                    if ($scope.activeTab === 'myPrograms') {
                        getStandardsStateDescriptionDetails();
                        return $currentUser.updateProductSubscriptions(getSelectedPrograms())
                            .then(function() {
                                $scope.settingsSuccess = true;
                                $scope.reset();
                                success();

                            }, function(err) {
                                $log.error('failed to subscribe!', err);
                            });
                    }

                    if ($scope.activeTab === 'aboutMe') {
                        return saveProfile(success, fail);
                    }
                } else {
                    $scope.settingsError = true;
                    $scope.isInProgress = false;
                    fail();
                }
            };

            $scope.reset = function() {
                var p,
                    course,
                    checkbox;

                // reset form to pristine
                $scope[$scope.activeTab + 'Form'].$setPristine();

                $scope.editUser = angular.copy($currentUser);
                if (!$scope.editUser.middleName) {
                    $scope.editUser.middleName = null;
                }

                $scope.selectedLanguage = 'English';
                var curLocale = $scope.editUser.getAttribute('profile.locale');
                if (curLocale === 'es') {
                    $scope.selectedLanguage = 'Spanish';
                }

                // reset programs
                var subscribed = $currentUser.subscribedCourses;
                for (p = 0; p < $currentUser.availableCourses.length; p++) {
                    course = $currentUser.availableCourses[p];
                    checkbox = _.findWhere($scope.availablePrograms, {
                        name: course
                    });
                    if (checkbox) {
                        checkbox.checked = checkbox.disabled = _.contains(subscribed, course);
                    }
                }

                // reset about me
                $scope.selectedProfileIcon = $scope.editUser.getAttribute('profile.avatar') || '01_teacher';
                $scope.selectedBG = $scope.editUser.getAttribute('home.background') || 'teacher1';
                $scope.facingName = $scope.editUser.getAttribute('profile.displayName');
                resetGrades($scope.editUser.getAttribute('profile.grades'));

                // reset button
                $scope.isInProgress = false;
                $scope.settingsError = false;

                return;
            };

            $scope.resetPasswordSuccess = function() {
                $scope.settingsSuccess = true;
            };

            $scope.$on('$locationChangeStart', function() {
                //remove the saved password when navigating away from the tab
                $scope.editUser.password = null;
                $currentUser.password = null;
            });

            $scope.getGoogleClassroomBannerText = function() {
                var googleClassroomConnectedBannerText = $scope.googleClassroomText.yourGoogleClassroomAccount +
                    '(' + $scope.googleClassroomEmailAddress + ') ' + $scope.googleClassroomText.connectedToRealize;
                return googleClassroomConnectedBannerText;
            };

            $scope.getGoogleClassroomBannerButtonText = function() {
                return $scope.isUserLinked ? $scope.googleClassroomText.connectMoreGoogleClasses :
                    $scope.googleClassroomText.getStarted;
            };

            $scope.disconnectGoogleClassroom = function() {

                var telemetryEventObject = googleClassroomUtils
                    .buildTelemetryEventObject(GOOGLE_CLASSROOM.SETTINGS,
                        GOOGLE_CLASSROOM.ACCOUNT_LINKING, '',
                        GOOGLE_CLASSROOM.PROGRAM_NOT_AVAILABLE,
                        GOOGLE_CLASSROOM.DISCONNECT_ACCOUNT,
                        GOOGLE_CLASSROOM.GOOGLE_DISCONNECT_ACCOUNT, '');

                googleClassroomUtils.sendTelemetryEvent(GOOGLE_CLASSROOM.DISCONNECT, telemetryEventObject);

                // GraphQL mutate query to disconnect current google classroom
                var disconnectGoogleClassroomQuery = 'mutation {unlinkUserMapping {success,}}';

                googleClassroomService.classSyncServiceMutate(disconnectGoogleClassroomQuery)
                    .then(function() {
                        $scope.isUserLinked = false;
                        $scope.showDisconnect = false;
                        if ($rootScope.assigneesData && $rootScope.assigneesData.classRosters.length) {
                            $rootScope.dirtyAssigneesData = true; // to get latest roster information
                        } else if ($rootScope.currentUser.getAttribute('classes.created')) {
                            $rootScope.currentUser.setAttribute('classes.created', false);
                        }
                    })
                    .catch(function(errorResponse) {
                        $log.error('error', errorResponse);
                    });
            };

            var cancelButton = {
                label: lwcI18nFilter('googleClassroom.disconnectModal.cancel'),
                ariaLabel: lwcI18nFilter('googleClassroom.disconnectModal.cancel'),
                action: function() {
                    if ($scope.isGCAutoPlusTeacherWithClassLinkingEnabled()) {
                        disconnectModal.deactivate();
                    } else {
                        standardModal.deactivate();
                    }
                },
                className: 'disconnect-cancel-button',
                disabled: false,
            };

            var yesButton = {
                label: lwcI18nFilter('googleClassroom.disconnectModal.yes'),
                ariaLabel: lwcI18nFilter('googleClassroom.disconnectModal.yes'),
                action: function() {
                    if ($scope.isGCAutoPlusTeacherWithClassLinkingEnabled()) {
                        disconnectModal.deactivate();
                    } else {
                        standardModal.deactivate();
                    }
                    $scope.disconnectGoogleClassroom();
                },
                className: [],
                disabled: false,
            };

            $scope.disconnectConfirmationModal = function() {
                if ($scope.isGCAutoPlusTeacherWithClassLinkingEnabled()) {
                    var messageBold = lwcI18nFilter('googleClassroom.disconnectModal.messageBold');
                    var message1 = lwcI18nFilter('googleClassroom.disconnectModal.message1');
                    var message2 = lwcI18nFilter('googleClassroom.disconnectModal.message2.header');
                    var line1 = lwcI18nFilter('googleClassroom.disconnectModal.message2.line1');
                    var line2 = lwcI18nFilter('googleClassroom.disconnectModal.message2.line2');
                    var line3 = lwcI18nFilter('googleClassroom.disconnectModal.message2.line3');
                    var bottom = lwcI18nFilter('googleClassroom.disconnectModal.message2.bottom');

                    disconnectModal.activate({
                        cssClass: '',
                        heading: lwcI18nFilter('googleClassroom.disconnectModal.header'),
                        description: [messageBold, message1, message2, line1, line2, line3, bottom],
                        buttons: [cancelButton, yesButton],
                        closeButton: true,
                        overlayActive: true,
                        closeButtonLabel: lwcI18nFilter('global.modal.close.a11y'),
                        closeAction: function() {
                            disconnectModal.deactivate();
                        }
                    });
                } else {
                    standardModal.activate({
                        heading: lwcI18nFilter('googleClassroom.disconnectModal.header'),
                        description: lwcI18nFilter('googleClassroom.disconnectModal.message'),
                        buttons: [cancelButton, yesButton],
                        closeButton: true,
                        overlayActive: true,
                        cssClass: 'disconnect-confirmation-modal',
                        closeAction: function() {
                            standardModal.deactivate();
                        }
                    });
                }
            };
        }
    ]);
