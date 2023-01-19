angular.module('RealizeDataServices')
    .factory('Assignee', [
        '$log',
        'ASSIGNMENT_CONSTANTS',
        'GOOGLE_CLASSROOM',
        function($log, ASSIGNMENT_CONSTANTS, GOOGLE_CLASSROOM) {
            'use strict';

            function Assignee(json, type) {
                var self = this;

                angular.copy(json || {}, self);
                self.type = type;
                if (!self.className || !self.classId) {
                    $log.warn('Invalid assignee - Missing className or classId', self);
                }

                if (self.$isClass()) {
                    self.assigneeTitle = self.name = json.className;

                } else if (self.$isGroup()) {
                    self.assigneeId = json.groupId;
                    self.assigneeTitle = self.name = json.groupName;

                } else if (self.$isStudent()) {
                    if (!json.lastName && !json.firstName) {
                        self.name = json.studentName; //studentName will be 'Missing Student'
                    } else {
                        self.name = (json.lastName || '') + ', ' + (json.firstName || '');
                    }
                    self.assigneeId = json.studentId;
                    self.assigneeTitle = self.name;
                }
                self.rosterSource = json.rosterSource;
                self.googleLinkedClass = json.googleLinkedClass;
            }

            /***** Prototypes *****/
            Assignee.prototype.$isClass = function() {
                return this.type === ASSIGNMENT_CONSTANTS.ASSIGNEE_TYPE.CLASS;
            };

            Assignee.prototype.$isGroup = function() {
                return this.type === ASSIGNMENT_CONSTANTS.ASSIGNEE_TYPE.GROUP;
            };

            Assignee.prototype.$isStudent = function() {
                return this.type === ASSIGNMENT_CONSTANTS.ASSIGNEE_TYPE.STUDENT;
            };

            Assignee.prototype.$getSerializedString = function(prefix) {
                var self = this;
                var classString = prefix + '.classUuid' + '=' + self.classId; //All assignee is bind to class

                if (self.$isClass()) {
                    return classString;
                } else if (self.$isGroup()) {
                    return classString + '&' + prefix + '.groupUuid' + '=' + self.assigneeId;
                } else if (self.$isStudent()) {
                    return classString + '&' + prefix + '.studentUuid' + '=' + self.assigneeId;
                }
            };

            Assignee.prototype.isFromGoogleClass = function() {
                return this.rosterSource === GOOGLE_CLASSROOM.ROSTER_SOURCE.GOOGLE_CLASSROOM || this.googleLinkedClass;
            };

            Assignee.prototype.showGoogleClassIcon = function() {
                return this.rosterSource === GOOGLE_CLASSROOM.ROSTER_SOURCE.GOOGLE_CLASSROOM && !this.googleLinkedClass;
            };

            return Assignee;
        }
    ]);
