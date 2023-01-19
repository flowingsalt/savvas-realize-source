angular.module('RealizeDataServices')
    .factory('ClassRoster', [
        '$http',
        '$log',
        'MEDIA_PATH',
        'REST_PATH',
        '$q',
        '$rootScope',
        '$cacheFactory',
        'RealizeHelpers',
        'User',
        'BrowserInfo',
        'GOOGLE_CLASSROOM',
        function($http, $log, MEDIA_PATH, restPath, $q, $rootScope, $cacheFactory, $helpers,
            User, BrowserInfo, GOOGLE_CLASSROOM) {
            'use strict';

            var cache = $cacheFactory('ClassRosterCache'),
                cacheKeys = []; // since the cache factory doesn't allow for direct enumeration

            function ClassRoster(json) {
                angular.copy(json || {}, this);

                if (this.classImageUrl) {
                    var parts = this.classImageUrl.split('/'),
                        img = parts[parts.length - 1],
                        defaultThumbnail;

                    if (_.findWhere(ClassRoster.thumbnailBank, {image: img})) {
                        // exists in the bank, just upgrade the image
                        this.classImageUrl = ClassRoster.thumbnailRoot +
                            img.replace('.png', (BrowserInfo.isHDDisplay ? '@2x.png' : '.png'));
                    } else {
                        defaultThumbnail = ClassRoster.thumbnailBank[2];
                        this.classImageUrl = ClassRoster.thumbnailRoot +
                            (BrowserInfo.isHDDisplay ? defaultThumbnail.retina : defaultThumbnail.image);
                    }
                }
            }

            // caching is done by url in the http service
            var getCacheId = function(query) {
                if (angular.isString(query)) {
                    // this should only be an ID used for single roster access
                    return restPath + '/class_roster/' + query;
                }

                if (!angular.isObject(query)) {
                    $log.error('query must be an object!', query);
                    return;
                }

                if (query.id || query.classId) {
                    var getId = query.id || query.classId;
                    return restPath + '/class_roster/' + getId;
                }

                // following logic from .get below (this is for student login only currently)
                if (query.studentId) {
                    return restPath + '/class_roster/get_class_rosters_by_student';
                }

                // otherwise, http is going to build the url using params
                return $helpers.buildUrl(restPath + '/class_roster', query);
            };

            var addToCache = function(key, value) {
                cache.put(key, value);
                cacheKeys.push(key);
                cacheKeys = _.uniq(cacheKeys);
            };

            ClassRoster.clearRostersWithStudentDetailsFromCache = function() {
                var lists = [];
                angular.forEach(cacheKeys, function(key) {
                    var cacheItem = cache.get(key);
                    if (cacheItem && angular.isDefined(cacheItem.students)) {
                        lists.push(key);
                    }
                });
                angular.forEach(lists, function(list) {
                    cache.remove(list);
                });

                // update cacheKeys
                cacheKeys = _.difference(cacheKeys, lists);
            };

            // remove this instance from all caching
            ClassRoster.prototype.$clearCache = function() {
                var self = this;

                // first remove the single
                cache.remove(getCacheId(self.classId));

                // any other query lists are now invalidated
                // either this one was a part of a list likely or altering it might make it be a part next time
                var lists = [];
                angular.forEach(cacheKeys, function(key) {
                    if (key.indexOf('?') >= 0) {
                        lists.push(key);
                    }
                });
                angular.forEach(lists, function(list) {
                    cache.remove(list);
                });

                // update cacheKeys
                lists.push(getCacheId(self.classId));
                cacheKeys = _.difference(cacheKeys, lists);
            };

            // update the caching for a specific instance (will invalidate lists too)
            ClassRoster.prototype.$updateCache = function() {
                var cacheKey = getCacheId(this.classId);
                // for now just brute clobbering
                this.$clearCache();
                addToCache(cacheKey, this);
            };

            // ALL various GET operations in here, by query params (eventually the server should be RESTified)
            // ALWAYS uses cache, note: other classes that manipulate classes should
            // invalidate and/or update the cache using the above ID retrieval
            ClassRoster.get = function(query) {
                if (query && query.assignmentApiV2) { delete query.assignmentApiV2; }

                if (angular.isString(query)) {
                    // assume it's a roster id
                    query = {id: query};
                }
                if (!angular.isObject(query)) {
                    // for the case of undefined
                    query = {};
                }

                var url = restPath + '/class_roster',
                    deferred = $q.defer(),
                    single = false,
                    student = false;

                var cacheKey = getCacheId(query);
                if (query.noCachedData !== true && cache.get(cacheKey)) {
                    $log.debug('using cache:', cacheKey, cache.get(cacheKey));
                    deferred.resolve(cache.get(cacheKey));
                } else {
                    // until server has proper REST some of this logic remains in the UI
                    if (query.studentId) {
                        // technically this url only works for current logged in student o.O
                        url = restPath + '/class_roster/get_class_rosters_by_student';

                        student = true;
                    }

                    if (query.id || query.classId) { // query for ID = get single
                        var getId = query.id || query.classId;
                        url = restPath + '/class_roster/' + getId;

                        single = true;
                    }

                    $http.get(url, {
                        cache: false, // don't use built in http service because we can't manage it easily
                        params: (single || student || $.isEmptyObject(query)) ? null : query
                    })
                    .then(function(response) {
                        var rosters;

                        if (single) {
                            rosters = new ClassRoster(response.data.roster);
                            rosters.students = [];
                            if (response.data.studentUsers) {
                                angular.forEach(response.data.studentUsers.users, function(data) {
                                    var student = new User(
                                            angular.extend(data.rumbaUser, {userAttributes: data.attributes})
                                        );
                                    rosters.students.push(student);
                                });
                            } else {
                                rosters.students = [];
                            }
                        } else if (student) {
                            // students get a direct list
                            rosters = [];
                            angular.forEach(response.data, function(data) {
                                var roster = new ClassRoster(data);
                                roster.reportingData = {};
                                rosters.push(roster);
                            });
                        } else {
                            rosters = [];

                            // tag current user with count of hidden classes
                            $rootScope.currentUser.$setInactiveRosterCount(
                                response.data.inactiveCount || 0
                            );

                            angular.forEach(response.data.rosters, function(data) {
                                var roster = new ClassRoster(data);
                                if (response.data.classActivityDataMap) {
                                    // append activity data if present (should be)
                                    roster.reportingData = response.data.classActivityDataMap[roster.classId] || {};
                                } else {
                                    roster.reportingData = {};
                                }
                                rosters.push(roster);
                            });
                        }

                        // we actually want to cache the resulting roster, not the http response, modify
                        addToCache(cacheKey, rosters);

                        deferred.resolve(rosters);
                    }, function(err) {
                        deferred.reject(err);
                    });
                }

                return deferred.promise;
            };

            // this is get all for the currently logged in teacher with group and student data
            ClassRoster.getClassesWithMetadata = function(excludeClassDetails) {
                var deferred = $q.defer();

                if ($rootScope.assigneesData && !$rootScope.dirtyAssigneesData) {
                    deferred.resolve($rootScope.assigneesData);
                } else {
                    $http.get(restPath + '/user/classmetadata?excludeClassDetails=' +
                        (excludeClassDetails ? true : false))
                        .then(function(response) {
                            var results = response.data;
                            var returnObj = {
                                classRosters: [],
                                groups: [],
                                students: []
                            };

                            if (excludeClassDetails) {
                                deferred.resolve(results);
                            }

                            angular.forEach(results.classRosters, function(roster) {
                                returnObj.classRosters.push(new ClassRoster(roster));
                            });
                            angular.forEach(results.groups, function(group) {
                                returnObj.groups.push(group);
                            });
                            angular.forEach(results.students, function(student) {
                                returnObj.students.push(student);
                            });

                            $rootScope.assigneesData = returnObj;
                            deferred.resolve($rootScope.assigneesData);
                        }, function(err) {
                            return $q.reject('Error getting group and student data', err);
                        });
                }
                return deferred.promise;
            };

            // delete all rosters for the current user only, only for admins!
            ClassRoster.deleteAll = function(success, error) {
                return $http['delete'](restPath + '/class_roster')
                    .then(function(response) {
                        $rootScope.dirtyAssigneesData = true;
                        return response.data;
                    }, function(err) {
                        return $q.reject(err);
                    })
                    .then(success, error);
            };

            ClassRoster.getActivity = function(classIds) {
                var promise, url;

                if (angular.isArray(classIds)) {
                    url = restPath + '/class_roster/activity';
                    promise = $http.get(url, {
                        params: {
                            classIds: classIds
                        }
                    });
                } else {
                    // do a single one
                    url = restPath + '/class_roster/' + classIds + '/activity';
                    promise = $http.get(url);
                }

                return promise.then(function(response) {
                    return response.data;
                }, function(err) {
                    return $q.reject(err);
                });
            };

            // get reporting data for assignments for classes
            ClassRoster.getAssignmentActivity = function(classIds, success, error) {
                var promise, url;

                if (angular.isArray(classIds)) {
                    url = restPath + '/class_roster/activity/assignment';
                    promise = $http.get(url, {
                        params: {
                            classIds: classIds
                        }
                    });
                } else {
                    // do a single one
                    url = restPath + '/class_roster/' + classIds + '/activity/assignment';
                    promise = $http.get(url);
                }

                if (angular.isDefined(success) && angular.isFunction(success)) {
                    promise.then(success);
                }

                if (angular.isDefined(error) && angular.isFunction(error)) {
                    promise.error(error);
                }

                return promise;
            };

            ClassRoster.thumbnailRoot = MEDIA_PATH + '/skins/default/images/class_roster_icons/';
            ClassRoster.thumbnailBank = [];
            var i;
            for (i = 1; i < 15; i++) {
                var img = {
                    caption: 'Class Image ' + i,
                    image: 'class' + i + '.png',
                    retina: 'class' + i + '@2x.png'
                };
                ClassRoster.thumbnailBank.push(img);
            }

            // for each instance
            ClassRoster.prototype.$hasProductId = function(productId) {
                var self = this;
                return $.Enumerable.From(self.productIds).IndexOf(productId) >= 0;
            };

            // create or update the roster
            ClassRoster.prototype.$save = function(success, error) {
                var url = restPath + '/class_roster',
                    self = this;

                // already have an ID? we're updating
                if (_.isString(self.classId) && !_.isEmpty(self.classId.trim())) {
                    url += '/' + self.classId;
                }

                // productId array must be complete to avoid server errors
                if (angular.isArray(self.productIds)) {
                    // scrub it for empty values
                    self.productIds = $.Enumerable.From(self.productIds)
                        .Where(function(id) {
                            return (angular.isDefined(id) && id !== null && id.length > 0);
                        }).ToArray();
                }

                // TODO: set server to use PUT or POST
                return $http.post(url, self)
                    .then(function(response) {
                        $log.log('class roster $save success', response.data);
                        // if it wasn't new, it should be the same, otherwise new needs this
                        self.classId = response.data.classId;

                        $rootScope.dirtyAssigneesData = true;
                        if (self.updateTheme) {
                            //Changing the theme effects the student's learningExperience property
                            //Clear cached items containing user properties
                            ClassRoster.clearRostersWithStudentDetailsFromCache();
                            // backend takes care to set the student's theme. So, set the flag to false to avoid a
                            // rest call for each student
                            var flagToNotPersistTheme = false;
                            angular.forEach(self.students, function(student) {
                                student.setAttribute('profile.learningExperience',
                                                    self.learningExperience,
                                                    flagToNotPersistTheme);
                            });
                        }
                        // update cache
                        self.$updateCache();

                        return self;
                    }, function(err) {
                        return $q.reject(err);
                    })
                    .then(success, error);
            };

            // delete this instance, only generally used by admin
            ClassRoster.prototype.$delete = function(success, error) {
                var self = this,
                    url = restPath + '/class_roster/' + self.classId;

                return $http['delete'](url)
                    .then(function() {
                        $rootScope.dirtyAssigneesData = true;

                        self.$clearCache();

                        return self;
                    }, function(err) {
                        return $q.reject(err);
                    })
                    .then(success, error);
            };

            // hide this instance
            ClassRoster.prototype.$hide = function(success, error) {
                var self = this,
                    url = restPath + '/class_roster/' + self.classId + '/status';

                return $http.post(url, {
                    status: 'Inactive'
                })
                .then(function() {
                    self.status = 'INACTIVE';
                    $log.debug(self);
                    $rootScope.currentUser.removeClassWithoutPrograms(self.classId);
                    $rootScope.dirtyAssigneesData = true;
                    return self;
                }, function(err) {
                    return $q.reject(err);
                })
                .then(success, error);
            };

            // unhide this instance
            ClassRoster.prototype.$unhide = function(success, error) {
                var self = this,
                    url = restPath + '/class_roster/' + self.classId + '/status';

                return $http.post(url, {
                    status: 'Active'
                })
                .then(function() {
                    self.status = 'ACTIVE';
                    $log.debug(self);
                    if (!self.productIds || !self.productIds.length) {
                        $rootScope.currentUser.addClassWithoutPrograms(self.classId);
                    }
                    $rootScope.dirtyAssigneesData = true;
                    return self;
                }, function(err) {
                    return $q.reject(err);
                })
                .then(success, error);
            };

            // takes array of students or single, just ID necessary
            ClassRoster.prototype.$addStudents = function(students, success, error) {
                var self = this,
                    url = restPath + '/class_roster/' + self.classId + '/students',
                    data = {
                        studentIds: angular.isArray(students) ? (students.length ? students : '') : [students]
                    };

                $log.log('addStudents', self, data);

                //Adding a student to a class, effects learningExperience property
                //Clear cached items containing user properties
                ClassRoster.clearRostersWithStudentDetailsFromCache();
                var promise = $http.post(url, data);
                $rootScope.dirtyAssigneesData = true;

                if (angular.isDefined(success) && angular.isFunction(success)) {
                    promise.then(success);
                }

                if (angular.isDefined(error) && angular.isFunction(error)) {
                    promise.catch(error);
                }

                return promise;
            };

            ClassRoster.prototype.$removeStudents = function(students, success, error) {
                var self = this,
                    url = restPath + '/class_roster/' + self.classId + '/students',
                    params = {
                        studentIds: angular.isArray(students) ? (students.length ? students : '') : [students]
                    };

                var promise = $http['delete'](url, {
                    params: params
                });
                $rootScope.dirtyAssigneesData = true;

                if (angular.isDefined(success) && angular.isFunction(success)) {
                    promise.then(success);
                }

                if (angular.isDefined(error) && angular.isFunction(error)) {
                    promise.error(error);
                }

                return promise;
            };

            ClassRoster.prototype.$hasCoTeachers = function() {
                var self = this;

                return self.teacherIds && self.teacherIds.length > 1;
            };

            ClassRoster.prototype.$setSharedTeachers = function(rosterSharedTeachers) {
                this.sharedTeachers = rosterSharedTeachers || [];
            };

            ClassRoster.prototype.$getSharedTeachers = function() {
                return this.sharedTeachers;
            };

            ClassRoster.prototype.isGoogleClass = function() {
                return this.rosterSource === GOOGLE_CLASSROOM.ROSTER_SOURCE.GOOGLE_CLASSROOM || this.googleLinkedClass;
            };

            return ClassRoster;
        }
    ]);
