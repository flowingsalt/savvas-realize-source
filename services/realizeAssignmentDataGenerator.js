angular.module('RealizeDataServices')
    .factory('RealizeAssignmentDataGenerator', [
        'Content',
        'ASSIGNMENT_CONSTANTS',
        function(Content, ASSIGNMENT_CONSTANTS) {
            'use strict';

            var service = function(itemToBeAssigned, createNewAssignment, helper, itemMode) {

                var ret = angular.extend(this, helper);

                ret.itemToBeAssigned = itemToBeAssigned;
                ret.createNewAssignment = createNewAssignment;
                ret.editAssignment = !createNewAssignment;

                // this flag is used to ensure that the assignment what is viewed (original or customized version)
                // is only assigned --> RGHT-63734
                ret.itemMode = itemMode;

                // private functions
                function isAssignmentInEditMode() {
                    return ret.editAssignment && ret.itemToBeAssigned && ret.itemToBeAssigned.contentItem;
                }

                function setEquellaItemIdForExternalSourceItem() {
                    if (angular.isDefined(ret.itemToBeAssigned.originalEquellaItemId) && ret.createNewAssignment) {
                        ret.itemToBeAssigned.id = ret.itemToBeAssigned.originalEquellaItemId;
                    }
                }

                function getMultiLanguageQuery() {
                    var multiLanguageQuery = {};
                    setEquellaItemIdForExternalSourceItem();
                    if (ret.createNewAssignment) {
                        multiLanguageQuery = {
                                contentId: ret.itemToBeAssigned.id,
                                version: ret.itemToBeAssigned.version,
                                levels: ((ret.itemToBeAssigned.mediaType === 'Lesson') ? 3 : 1)
                            };
                    } else if (isAssignmentInEditMode()) {
                        multiLanguageQuery = {
                                contentId: ret.itemToBeAssigned.itemUuid,
                                version: ret.itemToBeAssigned.itemVersion,
                                levels: ((ret.itemToBeAssigned.contentItem.mediaType === 'Lesson') ? 3 : 1)
                            };
                    }
                    return multiLanguageQuery;
                }

                //public apis
                ret.getContent = function() {
                    var multiLanguageQuery = getMultiLanguageQuery();
                    return Content.get({
                        contentId: multiLanguageQuery.contentId,
                        version: multiLanguageQuery.version,
                        levels: multiLanguageQuery.levels,
                        allLanguages: true
                    });
                };

                ret.getCustomContent = function(params) {
                    return Content.getCustomContent(params);
                };

                ret.getAssignmentData = function() {
                    var assignmentObj;
                    if (ret.createNewAssignment) {
                        // adjust reference if customized item is used (non-ajax, so no need to wait)
                        ret.itemToBeAssigned = ret.itemMode ?
                            ret.itemToBeAssigned : ret.itemToBeAssigned.$getDefaultVersion();
                        assignmentObj = ret.createAssignmentObjectInCreateMode(ret.itemToBeAssigned);
                        assignmentObj.title = (ret.itemToBeAssigned.$getTitle())
                            .substring(0, ASSIGNMENT_CONSTANTS.TITLE_MAX_LENGTH);

                        ret.itemToBeAssigned.assignmentAttachment =
                            ret.createAssignmentAttachment(ret.itemToBeAssigned);
                    } else if (isAssignmentInEditMode()) {
                        ret.itemToBeAssigned.allowRemediation = itemToBeAssigned.allowRemediation;
                        ret.itemToBeAssigned.allowMultipleLanguage = itemToBeAssigned.allowMultipleLanguage;
                        ret.itemToBeAssigned.includeRRSActivity = itemToBeAssigned.includeRRSActivity;
                        assignmentObj = {
                                title: ret.itemToBeAssigned.title,
                                assignees: ret.itemToBeAssigned.assignees || [],
                                assignedTo: ret.itemToBeAssigned.assignedTo || [],
                                classUuids: ret.itemToBeAssigned.classUuids,
                                contentItem: ret.itemToBeAssigned.contentItem,
                                assignmentId: ret.itemToBeAssigned.assignmentId,
                                groupId: ret.itemToBeAssigned.groupId,
                                classUuid: ret.itemToBeAssigned.classUuid,
                                userId: ret.itemToBeAssigned.userId,
                                multiClassId: ret.itemToBeAssigned.multiClassId,
                                itemUuid: ret.itemToBeAssigned.itemUuid,
                                itemVersion: ret.itemToBeAssigned.itemVersion,
                                updateId: ret.itemToBeAssigned.updateId,
                                dueDate: new Date(ret.itemToBeAssigned.dueDate).toString('MM/dd/yyyy'),
                                startDate: new Date(ret.itemToBeAssigned.startDate).toString('MM/dd/yyyy'),
                                instructions: ret.itemToBeAssigned.instructions,
                                allowRemediation: ret.itemToBeAssigned.allowRemediation,
                                allowMultipleLanguage: ret.itemToBeAssigned.allowMultipleLanguage,
                                includeRRSActivity: ret.itemToBeAssigned.includeRRSActivity
                            };
                    }
                    return assignmentObj;
                };

                return ret;
            };

            return service;
        }
    ]);

