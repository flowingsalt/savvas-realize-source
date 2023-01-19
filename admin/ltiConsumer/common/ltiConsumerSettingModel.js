angular.module('Realize.admin.ltiConsumer.common.LTIConsumerSettingModel', [])
    .constant('ReservedKeywords', [
        'lti_message_type',
        'lti_version',
        'user_id',
        'roles',
        'launch_presentation_locale',
        'launch_presentation_document_target',
        'launch_presentation_css_url',
        'launch_presentation_width',
        'launch_presentation_height',
        'context_id',
        'context_type',
        'launch_presentation_return_url',
        'role_scope_mentor',
        'tool_consumer_instance_guid',
        'user_image',
        'context_title',
        'context_label',
        'resource_link_description',
        'lis_person_name_given',
        'lis_person_name_family',
        'lis_person_name_full',
        'lis_person_contact_email_primary',
        'user_image',
        'lis_person_sourcedid',
        'lis_course_offering_sourcedid',
        'lis_course_section_sourcedid',
        'tool_consumer_info_product_family_code',
        'tool_consumer_info_product_family_version',
        'tool_consumer_instance_name',
        'tool_consumer_instance_description',
        'tool_consumer_instance_url',
        'tool_consumer_instance_contact_email',
        'lti_message_type',
        'reg_key',
        'reg_password',
        'tc_profile_url'
    ])
    .constant('LTIMaxLengths', {
        maxCustomFieldLength : 300
    })
    .factory('LTIConsumerSettingModel', [
        'ReservedKeywords', 'LTIMaxLengths',
        function(ReservedKeywords, LTIMaxLengths) {
            'use strict';

            function LTIConsumerSettingModel(json) {
                this.name = this.description = this.partner = this.key = this.secret = this.domain = '';
                this.openNewWindow = false;
                this.configureClassId = true;
                this.customFields = [];

                if (angular.isDefined(json)) {
                    //server returns null for customFields if none present
                    json.customFields = json.customFields || [];
                    angular.extend(this, json);
                }
            }

            LTIConsumerSettingModel.prototype.addCustomField = function(key, value) {
                this.customFields.push({
                    key: key || '',
                    value: value || ''
                });
            };

            LTIConsumerSettingModel.prototype.setCustomField = function(customField, level, key, value) {
                this.customFields.push({
                    key: key || '',
                    value: value || ''
                });
            };

            LTIConsumerSettingModel.prototype.removeCustomFieldAt = function(index) {
                this.customFields.splice(index, 1);
            };

            LTIConsumerSettingModel.prototype.hasAllRequiredFields = function() {
                return ['name', 'key', 'secret', 'domain'].every(function(field) {
                    return this[field] && this[field].toString().length > 0;
                }, this);
            };

            LTIConsumerSettingModel.prototype.hasValidKey = function() {
                var keyLength = (this.key || '').length;
                //256 is max length for field in db
                return keyLength === 0 || (keyLength > 0 && keyLength <= 256);
            };

            LTIConsumerSettingModel.prototype.hasValidSecret = function() {
                var secretLength = (this.secret || '').length;
                //256 is max length for field in db
                return secretLength === 0 || (secretLength > 0 && secretLength <= 256);
            };

            LTIConsumerSettingModel.prototype.hasIncompleteCustomFields = function() {
                return !(this.customFields || []).every(function isComplete(cf) {
                    //valid if either NO fields populated, or BOTH
                    cf.key = cf.key || '';
                    cf.value = cf.value || '';
                    return cf.key.length + cf.value.length === 0 ||
                        (cf.key.length > 0 && cf.value.length > 0 &&
                            cf.key.length <= LTIMaxLengths.maxCustomFieldLength &&
                            cf.value.length <= LTIMaxLengths.maxCustomFieldLength);
                });
            };

            LTIConsumerSettingModel.prototype.hasDuplicateCustomFields = function() {
                var nonBlanks = (this.customFields || []).filter(function(cf) {
                    return cf.key && cf.key.length > 0;
                });

                return nonBlanks.length > 0 && nonBlanks.length !== _.uniq(_.pluck(nonBlanks, 'key'), function(val) {
                        return val.toLowerCase();
                    }).length;
            };

            LTIConsumerSettingModel.prototype.isDuplicateCustomField = function(idx) {
                var keyInQuestion = this.customFields[idx].key ? this.customFields[idx].key.toLowerCase() : '';

                return keyInQuestion.length !== 0 && this.customFields.some(function(field, fidx) {
                        return (field.key ? field.key.toLowerCase() : '') === keyInQuestion && fidx < idx;
                    });
            };

            LTIConsumerSettingModel.prototype.isCustomFieldReservedKeyword = function(idx) {
                var keyInQuestion = this.customFields[idx].key ? this.customFields[idx].key.toLowerCase() : '';

                return ReservedKeywords.indexOf(keyInQuestion) !== -1;
            };

            LTIConsumerSettingModel.prototype.hasCustomFieldWithReservedKeyword = function() {
                var self = this;
                return this.customFields.filter(function(field, idx) {
                    return self.isCustomFieldReservedKeyword(idx);
                }).length > 0;
            };

            LTIConsumerSettingModel.prototype.hasValidDomain = function() {
                /* RULES
                 *
                 * * each section contains only a-zA-Z0-9\-
                 * * each section between 1-63 chars
                 * * each section may only begin with a-zA-Z0-9
                 * * each section may only end with a-zA-Z0-9
                 * * entire host name <= 253 chars
                 *
                 * RegEx taken from:
                 * stackoverflow.com/questions/13027854/javascript-regular-expression-validation-for-domain-name
                 */

                var domainTest = /^((?:(?:(?:\w[\.\-\+]?)*)\w)+)((?:(?:(?:\w[\.\-\+]?){0,62})\w)+)\.(\w{2,6})$/;

                return !angular.isDefined(this.domain) || this.domain.length === 0 || domainTest.test(this.domain);
            };

            return LTIConsumerSettingModel;
        }
    ]);
