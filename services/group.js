angular.module('RealizeApp')
    .factory('Group', [
        '$log',
        '$http',
        '$q',
        'REST_PATH',
        '$rootScope',
        function($log, $http, $q, restPath, $rootScope) {
            'use strict';

            var init = function(group) {
                // pending refactor on server
                group.id = group.id || group.groupId;
                group.name = group.name || group.groupName;
                group.descr = group.descr || group.groupDescription;
                group.classMembers = group.classMembers || group.classStudents || {};

                // much like classMembers from server, members are grouped by class
                group.members = {};
                angular.forEach(group.classMembers, function(list, key) {
                    // we'll never have the RUMBA data at this point... see $syncMembers
                    group.members[key] = {studentIds: list, students: []};
                });
            };

            var Group = function(json) {
                var self = this;

                angular.copy(json || {}, self);

                init(self);
            };

            // use this to get members object safely
            Group.prototype.$getMembers = function(classId) {
                var self = this;

                if (!self.members[classId]) {
                    self.members[classId] = {studentIds: [], students: []};
                }

                return self.members[classId];
            };

            // use class roster data to match up with ids in members map
            Group.prototype.$syncMembers = function(roster) {
                var self = this,
                    members = self.$getMembers(roster.classId);

                // todo: test if !roster.students
                var rosterStudents = $.Enumerable.From(roster.students);

                // todo: count and report how many sync'd
                angular.forEach(members.studentIds, function(id) {
                    var student = rosterStudents.FirstOrDefault(null, '$.userId === "' + id + '"');
                    if (student !== null) {
                        members.students.push(student);
                    }
                });
            };

            Group.prototype.$save = function() {
                var self = this,
                    postData = {},
                    promise = null;

                if (self.id) {
                    // update
                    postData = {
                        groupName: self.name
                    };

                    promise = $http.post(restPath + '/groups/' + self.id, postData)
                        .then(function() {
                            $rootScope.dirtyAssigneesData = true;
                            return self;
                        }, function(err) {
                            return $q.reject('error updating group', err);
                        });
                } else {
                    // new
                    postData = {
                        groupName: self.name
                    };

                    promise = $http.post(restPath + '/groups', postData)
                        .then(function(response) {
                            self.id = response.data.groupId || response.data.id;
                            init(self);
                            $rootScope.dirtyAssigneesData = true;
                            return self;
                        }, function(err) {
                            $log.log('error creating group', err);
                            return $q.reject(err);
                        });
                }

                return promise;
            };

            Group.prototype.$saveMembers = function(classId) {
                // todo: if !classId save ALL
                var promise;

                var studentIds = this.$getMembers(classId).studentIds;
                if (!studentIds.length) { studentIds = ''; }

                promise = $http.post(restPath + '/groups/' + this.id + '/classes/' + classId + '/students', {
                    studentIds: studentIds
                }).then(function(response) {
                    $log.log('student update success', response);
                    $rootScope.dirtyAssigneesData = true;

                    return response;
                }, function(err) {
                    $log.error('student update error', err);

                    return $q.reject(err);
                });

                return promise;
            };

            Group.prototype.$delete = function() {
                // future release
                //$rootScope.dirtyAssigneesData = true;
                return;
            };

            // add array or single student object, should be User
            Group.prototype.$addStudents = function(classId, students) {
                var self = this,
                    members = self.$getMembers(classId),
                    studentsEnum = $.Enumerable.From(members.students);

                // only add non duplicates
                if (angular.isArray(students)) {
                    angular.forEach(students, function(student) {
                        if (studentsEnum.FirstOrDefault(null, '$.userId === "' + student.userId + '"') === null) {
                            members.students.push(student);
                            members.studentIds.push(student.userId);
                        }
                    });
                } else {
                    if (studentsEnum.FirstOrDefault(null, '$.userId === "' + students.userId + '"') === null) {
                        members.students.push(students);
                        members.studentIds.push(students.userId);
                    }
                }

                return;
            };

            Group.prototype.$removeStudents = function(classId, students) {
                var self = this,
                    members = self.$getMembers(classId),
                    studentsEnum = $.Enumerable.From(members.students);

                if (angular.isArray(students)) {
                    members.students = studentsEnum.Except(students).ToArray();
                } else {
                    members.students = studentsEnum.Except([students]).ToArray();
                }

                // rebuild studentIds
                members.studentIds = $.Enumerable.From(members.students).Select('$.userId').ToArray();

                return;
            };

            // get all groups for current user
            Group.getAll = function() {
                var promise = $http.get(restPath + '/groups')
                    .then(function(response) {
                        var groups = [];

                        angular.forEach(response.data, function(group) {
                            groups.push(new Group(group));
                        });

                        return groups;
                    }, function(err) {
                        return $q.reject('error getting groups', err);
                    });

                return promise;
            };

            // get all groups a particular user is a member of
            Group.getAllByUser = function() {
                return;
            };

            // get all groups a particular user is the owner/creator of
            Group.getAllByOwner = function(userId) {
                var promise = $http.get(restPath + '/groups/' + userId)
                    .then(function(response) {
                        var groups = [];

                        angular.forEach(response.data, function(group) {
                            groups.push(new Group(group));
                        });

                        return groups;
                    });

                return promise;
            };

            Group.getById = function() {
                // todo
                return;
            };

            return Group;
        }
    ]);
