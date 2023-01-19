angular.module('RealizeApp')
    .service('AssignmentDataGenerator', [
        'RealizeAssignmentDataGenerator',
        'ExternalAssignmentDataGenerator',
        'ASSIGNMENT_CONSTANTS',
        'AssignmentFacadeService',
        'ClassRoster',
        'Assignee',
        '$log',
        function(RealizeAssignmentDataGenerator, ExternalAssignmentDataGenerator, ASSIGNMENT_CONSTANTS,
            AssignmentFacadeService, ClassRoster, Assignee, $log) {
            'use strict';

            /**
             * This class has the following purposes:
             * 1. Create a Provider for populating the assignment modal depending on the source of
             *    the item (e.g. One Source or OpenEd)
             * 2. Common methods used by the above providers
             */

            var service = this;

            service.getInstance = function(itemSource, itemToBeAssigned, createNewAssignment, itemMode) {
                var self = this;
                if (angular.isString(itemSource)) {
                    if (itemSource === ASSIGNMENT_CONSTANTS.ONESOURCE) {

                        return new RealizeAssignmentDataGenerator(itemToBeAssigned, createNewAssignment,
                            self, itemMode);
                    }
                    return new ExternalAssignmentDataGenerator(itemSource, itemToBeAssigned, createNewAssignment, self);

                }
                return new RealizeAssignmentDataGenerator(itemToBeAssigned, createNewAssignment, self);
            };

            // common methods
            service.createAssignmentObjectInCreateMode = function(itemToBeAssigned) {
                var itemUuid = angular.isDefined(itemToBeAssigned.originalEquellaItemId) ?
                    itemToBeAssigned.originalEquellaItemId : itemToBeAssigned.id,
                    assignmentObj = {
                        assignees: [],
                        classUuids: [],
                        contentItem: itemToBeAssigned,
                        itemUuid: itemUuid,
                        itemVersion: itemToBeAssigned.version,
                        dueDate: null,
                        startDate: null,
                        instructions: null,
                        allowRemediation: false,
                        allowMultipleLanguage: false,
                        includeRRSActivity: false
                    };
                return assignmentObj;
            };

            service.createAssignmentAttachment = function(itemToBeAssigned) {
                return {
                    mediaType: itemToBeAssigned.mediaType,
                    fileType: itemToBeAssigned.fileType,
                    contentType: itemToBeAssigned.contentType
                };
            };

            var getClassByClassId = function(classRosters, classId) {
                return _.findWhere(classRosters, {
                    classId: classId
                });
            };

            service.getAssignees = function() {
                return ClassRoster.getClassesWithMetadata().then(function(classesDetails) {
                    var assignees = [];

                    //Classes
                    if (classesDetails.classRosters) {
                        angular.forEach(classesDetails.classRosters, function(roster) {
                            if (roster.studentIds.length > 0) { //Only Add if there are students
                                assignees.push(new Assignee(roster, ASSIGNMENT_CONSTANTS.ASSIGNEE_TYPE.CLASS));
                            }
                        });
                    }

                    //Groups
                    if (classesDetails.groups) {
                        angular.forEach(classesDetails.groups, function(group) {
                            var isClassPresent = getClassByClassId(classesDetails.classRosters, group.classId);
                            if (isClassPresent) {
                                group.className = isClassPresent.className;
                                group.rosterSource = isClassPresent.rosterSource;
                            } else {
                                $log.error('Cannot find matching class for', group);
                            }
                            assignees.push(new Assignee(group, ASSIGNMENT_CONSTANTS.ASSIGNEE_TYPE.GROUP));
                        });
                    }

                    //Students
                    if (classesDetails.students) {
                        angular.forEach(classesDetails.students, function(student) {
                            var isClassPresent = getClassByClassId(classesDetails.classRosters, student.classId);
                            if (isClassPresent) {
                                student.rosterSource = isClassPresent.rosterSource;
                            } else {
                                $log.error('Cannot find matching class for', student);
                            }
                            assignees.push(new Assignee(student, ASSIGNMENT_CONSTANTS.ASSIGNEE_TYPE.STUDENT));
                        });
                    }

                    return assignees;
                });
            };

            service.getPreSelectedAssignees = function(itemToBeAssigned, assignees) {
                return AssignmentFacadeService.getAllAssignedTos(itemToBeAssigned.assignmentId)
                    .then(function(assignedTos) {
                        var preSelectedAssignees = [];

                        var addAssignee = function(idTypeMatch) {
                            var assignee = _.findWhere(assignees, idTypeMatch);
                            if (assignee) {
                                preSelectedAssignees.push(assignee);
                            } else {
                                $log.error('Cannot find pre-selected assignee', idTypeMatch);
                            }
                        };

                        if (assignedTos) {
                            angular.forEach(assignedTos, function(selected) {
                                var match = {
                                    classId: selected.classUuid
                                };

                                if (!selected.groupUuid && !selected.studentUuid) {

                                    match.type = ASSIGNMENT_CONSTANTS.ASSIGNEE_TYPE.CLASS;

                                } else if (selected.groupUuid && !selected.studentUuid) {

                                    match.type = ASSIGNMENT_CONSTANTS.ASSIGNEE_TYPE.GROUP;
                                    match.groupId = selected.groupUuid;

                                } else {

                                    match.type = ASSIGNMENT_CONSTANTS.ASSIGNEE_TYPE.STUDENT;
                                    match.studentId = selected.studentUuid;

                                }

                                addAssignee(match);
                            });
                        }

                        return preSelectedAssignees;
                    });
            };
        }
    ]);
