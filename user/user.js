angular.module('RealizeDataServices')
    .constant('USER_ATTRIBUTE_KEY', {
        'DISMISS_OPEN_ED_SEARCH_TIPS_FOREVER': 'open_ed.search.tips.dismiss.forever'
    })
    .provider('User', function() {
        'use strict';

        var _baseAvatarImagePath = '/avatars/',
            supportedLocales = ['en', 'es'],
            defaultLocale = 'en';

        this.setBaseAvatarImagePath = function(path) {
            _baseAvatarImagePath = path;
        };

        this.$get = [
            '$q',
            '$http',
            '$log',
            '$cacheFactory',
            'REST_PATH',
            'RumbaDataService',
            '$rootScope',
            '$window', // for crsf token TODO: move to another config
            'BrowserInfo',
            'NBC_PROGRAM_NAME',
            function($q, $http, $log, $cacheFactory, REST_PATH,
                     RumbaDataService, $rootScope, $window, BrowserInfo, NBC_PROGRAM_NAME) {

                function User(json) {
                    var self = this;

                    // setup some defaults, they will be overridden if provided
                    self.userAttributes = {};

                    // create instance using json properties
                    if (json) {
                        angular.copy(json, self);
                    }

                    // need a "emailAddress" attribute for editing, instead of rumbaEmail
                    self.emailAddress = self.rumbaEmail;

                    // some of the naming vars dont come from server
                    self.$updateNames();

                    // the affiliations will have an entry for each role they play (CA, T, S)
                    // in this case we want distinct since the oleAffiliations don't have distinguishable differences
                    // if you want to know the role within an org, that's self.affiliations
                    self.oleAffiliations = _.uniq(self.oleAffiliations, function(org) {
                        return org.organizationId;
                    });

                    // need to update org data once
                    var orgIds = _.pluck(self.oleAffiliations, 'organizationId');
                    if (orgIds.length > 0) {
                        RumbaDataService.getOrgDetails(orgIds).then(function(orgDetails) {
                            angular.forEach(orgDetails, function(org) {
                                var matchedOrg = _.findWhere(self.oleAffiliations, {
                                    organizationId: org.organizationId
                                });
                                if (matchedOrg) {
                                    matchedOrg.orgDetails = org;
                                    var stateCode = self.getStateCode();
                                    if (matchedOrg.orgDetails.organizationId === self.primaryOrgId && !stateCode &&
                                        self.hasRole('ROLE_LIBRARY_ADMIN')) {
                                        self.setStateCode(org.state);
                                    }
                                }
                            });
                        });
                    }

                    if (self.primaryOrgRole === 'Student' && (self.primaryOrgId !== 'lti-org-id' &&
                            self.primaryOrgId !== 'student_center_org_id')) {
                        // Don't build the product details for the LTI Content viewer ('lti-org-id') since
                        // LTI uses a different mechanism for associating products to users.
                        self.productIdMap = {};
                        angular.forEach(self.affiliations, function(affiliation) {
                            // Build productId-productName map (for etext)
                            RumbaDataService.getProductDetails(affiliation.organizationId)
                            .then(function(productDetails) {
                                angular.forEach(productDetails, function(detail) {
                                    self.productIdMap[detail.productId] = detail.productDisplayName;
                                });
                            });

                        });

                    }

                    // set it to already existing to generate avatarUrl
                    self.$setAvatar(self.getAttribute('profile.avatar'));

                    self.isLibraryAdmin = self.hasRole('ROLE_LIBRARY_ADMIN');
                    self.isTeacher = self.hasRole('ROLE_TEACHER');
                    self.isStudent = self.hasRole('ROLE_STUDENT');
                    self.isReviewer = self.hasRole('ROLE_REVIEWER');
                    self.isContentReviewer = self.hasRole('ROLE_CONTENT_REVIEWER');
                    self.isContentPromoter = self.hasRole('ROLE_CONTENT_PROMOTER');
                    self.isLtiAUser = self.hasRole('ROLE_LTI_A_USER');
                    self.isCustomerAdmin = self.hasRole('ROLE_CUSTOMER_ADMIN');

                    if (self.userAttributes) {
                        self.isNativeRealizeUser = (self.userAttributes.userDomain === 'native');
                        self.isFederatedUser = (self.userAttributes.userDomain === 'federated');
                        self.userAttributes['profile.locale'] =
                            self.$validateLocale(self.userAttributes['profile.locale']);
                    }
                    self.userTheme = self.getAttribute('profile.learningExperience');
                    self.inactiveRosterCount = 0;
                    // this key used for local storage in a few places TODO: non PII prefs service
                    self.TEACHER_RESOURCES_DRAWER_KEY = 'teacherResourceDrawerOpen_' + self.userId;
                }

                User.prototype.$getAffiliationsOrgIds = function getAffiliiationOrgIds() {
                    return _.unique(_.pluck(this.affiliations, 'organizationId'));
                };

                User.prototype.$setAvatar = function(avatar, persist) {
                    var self = this,
                        deferred = $q.defer();

                    if (!angular.isDefined(persist)) {
                        persist = true;
                    }

                    self.setAttribute('profile.avatar', avatar, persist).then(function() {
                        var avatarUrl = _baseAvatarImagePath,
                            avatarAttr = self.getAttribute('profile.avatar');

                        if (self.primaryOrgRole === 'Student') {
                            avatarUrl += avatarAttr || 'default_student';
                            //$log.log('student avatarUrl', avatarUrl, avatarAttr);
                        } else {
                            avatarUrl += avatarAttr || 'default_teacher';
                        }

                        // the avatar url should have the extension omitted, so that retina can be applied
                        self.avatarUrl = avatarUrl + (BrowserInfo.isHDDisplay ? '@2x.png' : '.png');

                        deferred.resolve(self);

                    }, deferred.reject);

                    return deferred.promise;
                };

                // specifically set the profile.locale user attribute, and refresh the language
                User.prototype.$setLocale = function(locale, persist, suppressBroadcast) {
                    if (!angular.isDefined(persist)) {
                        persist = true;
                    }
                    var user = this;
                    locale = user.$validateLocale(locale);
                    $log.log('user $setLocale', locale);
                    return user.setAttribute('profile.locale', locale, persist)
                        .then(function() {
                            if (!suppressBroadcast) {
                                $rootScope.$broadcast('user.locale.changed', user, locale);
                            }
                        });
                };

                User.prototype.$validateLocale = function(userLocale) {
                    if (!userLocale) {
                        userLocale = $window.systemLang;
                    }

                    if (supportedLocales.indexOf(userLocale) !== -1) {
                        return userLocale;
                    }

                    return defaultLocale;
                };

                User.prototype.$getIpadPreview = function(preview, callback) {
                    $http.get(preview.ipadTokenRetrievalUrl).then(function(response) {
                        // Slice to strip beginning and end double quotes
                        var url = preview.ipadUrl.replace('{IPAD_TOKEN}', response.data);
                        callback(url);
                    });
                };

                // used to toggle boolean type attributes on a specific user
                User.prototype.$toggleAttribute = function(attr) {
                    var self = this;

                    if (!self.userAttributes) {
                        return;
                    }

                    if (self.userAttributes[attr]) {
                        self.userAttributes[attr] = false;
                    } else {
                        self.userAttributes[attr] = true;
                    }

                    // update server to match
                    var promise = $http.post(REST_PATH + '/user/attribute', $.param({
                        key: attr,
                        val: self.userAttributes[attr]
                    }));

                    return promise;
                };

                User.prototype.setAttribute = function(attr, value, persist) {
                    var self = this,
                        deferred = $q.defer();

                    if (!angular.isDefined(persist)) {
                        persist = true;
                    }

                    if (!self.userAttributes || self.getAttribute(attr) === value) {
                        //$log.log('attribute set or invalid', self.userAttributes);
                        deferred.resolve();
                        return deferred.promise;
                    }

                    // update in-memory value prior to any conversion, memory object should remain usable
                    self.userAttributes[attr] = angular.copy(value);

                    // convert value to JSON if needed, attributes must be strings
                    if (!angular.isString(value)) {
                        value = angular.toJson(value);
                    }

                    if (persist) {
                        var promise = $http.post(REST_PATH + '/user/attribute', $.param({
                            key: attr,
                            val: value
                        }));

                        return promise;
                    } else {
                        // we might not want to persist, in the case we are updating memory object of
                        // NOT the current user
                        // back end currently only supports currentuser
                        deferred.resolve();
                        return deferred.promise;
                    }
                };

                // get a single attribute from the user attributes
                // if getSync is true, fetch user attribute from server
                User.prototype.getAttribute = function(key, getAsync) {
                    var self = this,
                        value;

                    if (!self.userAttributes) {
                        return;
                    }

                    if (getAsync) {
                        var promise = $http.get(REST_PATH + '/user/attribute').then(function(response) {
                            self.userAttributes[key] = response.data[key];
                        });

                        return promise;
                    }

                    try {
                        // some values are not going to be JSON encoded, hence the try/catch block
                        value = angular.fromJson(self.userAttributes[key]);
                    } catch (e) {
                        value = self.userAttributes[key];
                    }

                    return value;
                };

                User.prototype.deleteAttribute = function(attr) {
                    var promise = $http.delete(REST_PATH + '/user/attribute?key=' + attr);
                    return promise;
                };

                User.prototype.hasRole = function(role) {
                    return _.contains(this.roles, role);
                };

                User.prototype.$getInactiveRosterCount = function() {
                    var user = this,
                        inactiveRosterCount = Number(user.inactiveRosterCount);
                    return isNaN(inactiveRosterCount) ? 0 : inactiveRosterCount;
                };

                User.prototype.$setInactiveRosterCount = function(count) {
                    var user = this;

                    count = Number(count);
                    user.inactiveRosterCount = isNaN(count) ? 0 : count;
                };

                User.prototype.showNoProgramModal = function(ignoreAttribute) {
                    var user = this,
                        classes = user.getAttribute('classes.withoutPrograms') || [],
                        hideModal = (ignoreAttribute) ? false : user.getAttribute('hideNoProgramModal');

                    return classes.length > 0 && !hideModal;
                };

                User.prototype.removeClassWithoutPrograms = function(id) {
                    var user = this,
                        classes = user.getAttribute('classes.withoutPrograms') || [],
                        hasClass = classes.indexOf(id);

                    if (hasClass > -1) {
                        return classes.splice(hasClass, 1);
                    }

                    return classes;
                };

                User.prototype.addClassWithoutPrograms = function(id) {
                    var user = this,
                        classes = user.getAttribute('classes.withoutPrograms') || [],
                        hasClass = classes.indexOf(id);

                    if (hasClass > -1) {
                        return classes;
                    }

                    return classes.push(hasClass);
                };

                User.prototype.$hasCenter = function() {
                    var user = this;

                    return user.isLibraryAdmin || user.getAttribute('hasCenter');
                };

                User.prototype.$hasLeveledReader = function() {
                    var user = this;

                    return user.getAttribute('hasLeveledReader');
                };

                function addUsernameToCache(username) {
                    $cacheFactory.get('$http').put(REST_PATH + '/check_username?username=' + username, [200, false]);
                }

                User.prototype.$create = function() {
                    var user = this;

                    var promise = $http.post(REST_PATH + '/rumba/user/create_user', {
                        firstName: user.firstName,
                        lastName: user.lastName,
                        userName: user.userName,
                        password: user.password,
                        'orgIds[]': [user.organizationId]
                    });

                    // update user with server info when done
                    promise.then(function(response) {
                        addUsernameToCache(user.userName);
                        angular.extend(user, response);
                    });

                    return promise;
                };

                User.prototype.$save = function() {
                    // if userId is present, update, else new
                    var self = this,
                        url = REST_PATH + '/user',
                        isUpdate = false,
                        outData;

                    if (angular.isDefined(self.userId) && self.userId.length > 0) {
                        url += '/' + self.userId;
                        isUpdate = true;
                    }

                    // new user is expecting "orgIds"
                    if (self.organizationId) {
                        self.orgIds = [self.organizationId];
                    } else if (self.primaryOrgIds && self.primaryOrgIds.length > 0) {
                        self.orgIds = self.primaryOrgIds;
                    } else if (self.primaryOrgId && self.primaryOrgId.length > 0) {
                        self.orgIds = [self.primaryOrgId];
                    } else {
                        // no org ids given, might be OK if updating
                        self.orgIds = [];
                    }

                    // copy data so as to not make adjustments for the controller on the actual object
                    outData = angular.copy(self);

                    if (isUpdate) {
                        outData.password = null; // for some reason the ctrl requires this on the back end.(todo: fix)
                        // also middleName is required
                        if (!outData.middleName) {
                            outData.middleName = null;
                        }
                    }

                    var promise = $http.post(url, outData)
                        .then(function(response) {
                            $log.log('saved user', response);
                            delete response.data.password;
                            angular.extend(self, response.data);

                            if (!isUpdate) {
                                addUsernameToCache(self.userName);
                            }
                            return self;
                        }, function(response) {
                            // RUMBA warning of username automatically generated
                            if (response.errorCode === 'ULC0003W') {
                                angular.extend(self, response.data);

                                return self;
                            } else {
                                $log.error('RUMBA creation ERROR:', response);
                                return $q.reject('RUMBA creation ERROR:' + response);
                            }
                        });

                    return promise;
                };

                User.prototype.$update = function() {
                    var url = REST_PATH + '/user/' + this.userId;

                    // todo: move to assignment service? something more specific?
                    // tight coupling
                    $rootScope.dirtyAssigneesData = true;

                    var data = {
                        userName: this.userName,
                        firstName: this.firstName,
                        lastName: this.lastName,
                        emailAddress: this.emailAddress,
                        password: this.password
                    };
                    if (this.middleName && this.middleName.length > 0) {
                        data.middleName = this.middleName;
                    }

                    return $http.post(url, data);
                };

                User.updatePasswordForUser = function(user, currentPassword, newPassword) {
                    user.password = newPassword;

                    var url = REST_PATH + '/user/' + user.userId + '/password';

                    return $http.post(url, {
                        currentPassword: currentPassword,
                        newPassword: newPassword,
                        csrfToken: $window.csrfToken
                    });
                };

                User.prototype.$setFirstName = function(name) {
                    this.firstName = name;
                    this.$updateNames();
                };

                User.prototype.$setLastName = function(name) {
                    this.lastName = name;
                    this.$updateNames();
                };

                User.prototype.$setMiddleName = function(name) {
                    var self = this;

                    this.middleName = name;
                    this.setAttribute('profile.middleName', name, self.userId === $rootScope.currentUser.userId)
                        .then(function() {
                            self.$updateNames();
                        });
                };

                User.prototype.$setLastFirst = function(name) {
                    // test to prevent errors in split below
                    if (!angular.isString(name) || name.search(',') === -1) {
                        return;
                    }

                    var names = name.split(','),
                        last = names[0].trim(),
                        first = names[1].trim();

                    this.firstName = first;
                    this.lastName = last;

                    this.$updateNames();
                };

                User.prototype.$updateNames = function() {
                    // middleName doesn't exist at rumba level, it's in the UA
                    if (!angular.isString(this.middleName) && this.getAttribute('profile.middleName')) {
                        this.middleName = this.getAttribute('profile.middleName');
                    }
                    if (this.middleName && $.trim(this.middleName).length > 0) {
                        this.fullName = [this.firstName, this.middleName, this.lastName].join(' ');
                    } else {
                        this.fullName = [this.firstName, this.lastName].join(' ');
                    }
                    this.firstAndLast = [this.firstName, this.lastName].join(' ');
                    this.lastFirst = [this.lastName, this.firstName].join(', ');
                };

                User.prototype.$canCustomizeItems = function() {
                    return $rootScope.currentUser.hasRole('ROLE_TEACHER');
                };

                User.findStudents = function(params) {
                    $log.log('findStudents', params);

                    if (!angular.isDefined(params)) {
                        params = {};
                    }

                    if (!angular.isDefined(params.pageSize)) {
                        params.pageSize = 15;
                    }

                    return $http.get(REST_PATH + '/student_search', {
                            params: params
                        })
                        .then(function(response) {
                            var results = [];

                            angular.forEach(response.users, function(u) {
                                results.push(new User(u.rumbaUser));
                            });

                            return results;
                        }, function(error) {
                            console.error('failed to search student values', error.errorCode, error.errorMessage);
                        });
                };

                // query for students
                User.query = function(params, cache) {
                    var deferred = $q.defer();
                    deferred.resolve([]);
                    // Do not show any student search results if the user is a demo user
                    if ($rootScope.currentUser.getAttribute('isSelfRegUser')) {
                        return deferred.promise;
                    }
                    var url = REST_PATH + '/student_search';

                    if (!angular.isDefined(params)) {
                        params = {};
                    }

                    if (!angular.isDefined(params.pageSize)) {
                        params.pageSize = 50; // max users to be found
                    }

                    // need to add * to query params for name
                    if (angular.isDefined(params.firstname)) {
                        params.firstname += '*';
                    }
                    if (angular.isDefined(params.lastname)) {
                        params.lastname += '*';
                    }

                    return $http.get(url, {
                            params: params,
                            cache: !!cache
                        })
                        .then(function(response) {
                            var results = [];
                            angular.forEach(response.data.users, function(u) {
                                // copy over the attributes so they get in the ctor
                                u.rumbaUser.userAttributes = u.attributes;
                                results.push(new User(u.rumbaUser));
                            });

                            return results;
                        }, function(err) {
                            return $q.reject(err);
                        });
                };

                // Get student by userId
                User.getUserById = function(userId) {
                    var url = REST_PATH + '/user/' + userId;
                    return $http.get(url)
                        .then(function(response) {
                            return new User(response.data);
                        }, function(error) {
                            return $q.reject(error);
                        });
                };

                // Get current session user
                User.getCurrentUser = function() {
                    var url = REST_PATH + '/user';
                    return $http.get(url)
                        .then(function(response) {
                            return response.data;
                        }, function(error) {
                            return $q.reject(error);
                        });
                };

                User.getUsersByIds = function(userIds) {
                    var retrieveUserList = {};

                    angular.forEach(userIds, function(userId) {
                        var userPromise = User.getUserById(userId).then(function(result) {
                            return result;
                        }, function() {
                            return null; //Consume the reject so the rest of the users can be returned
                        });
                        retrieveUserList[userId] = userPromise;
                    });

                    return $q.all(retrieveUserList);
                };

                // matches with backend /user/profile
                // needs some refactoring on the back end prolly
                // need to be careful what you send as it's fragile about things like 'profile.password'
                User.updateCurrentUserAttributes = function(attributes) {
                    return $http.post(REST_PATH + '/user/profile', attributes)
                        .then(function() {
                            angular.extend($rootScope.currentUser.userAttributes, attributes);
                        }, function(response) {
                            $log.error('error updating user profile', response);
                        });
                };

                User.prototype.$isSubscribedTo = function(course) {
                    var user = this;

                    return _.contains(user.subscribedCourses, course);
                };

                User.prototype.isNbcLearnUser = function() {
                    return this.$isSubscribedTo(NBC_PROGRAM_NAME);
                };

                User.prototype.setGoogleClassroomEnabled = function(val) {
                    this.setAttribute('google.classroom.enable', !!val, true);
                };

                User.prototype.isGoogleClassroomEnabled = function() {
                    return this.isTeacher && this.getAttribute('google.classroom.enable');
                };

                User.prototype.getLocale = function() {
                    return this.getAttribute('profile.locale');
                };

                User.prototype.setStateCode = function(stateCode) {
                    return this.setAttribute('profile.current.statecode', stateCode);
                };

                User.prototype.getStateCode = function() {
                    return this.getAttribute('profile.current.statecode');
                };

                User.prototype.getUserTheme = function() {
                    return this.getAttribute('profile.learningExperience') === null ? 'Standard' :
                        this.getAttribute('profile.learningExperience');
                };

                User.getSSOUrlDetails = function() {
                    var url = REST_PATH + '/rumba/ssourl/details';
                    return $http.get(url)
                        .then(function(response) {
                            return response.data;
                        }, function(error) {
                            return $q.reject('Failed to get SSO url details', error);
                        });
                };

                User.prototype.getFeatureAttributes = function() {
                    var user = this;
                    return user.featureAttributes || {};
                };

                User.prototype.setShareLastViewedAt = function(dateTime) {
                    var oldDateTime = this.getShareLastViewedAt();
                    return this.setAttribute('share.lastViewedAt', dateTime, true)
                        .then(function() {
                            $rootScope.$broadcast('share.lastViewedAt.changed', oldDateTime, dateTime);
                        });
                };

                User.prototype.getShareLastViewedAt = function() {
                    return this.getAttribute('share.lastViewedAt');
                };

                return User;
            }
        ];

    });
