/* eslint-disable */
var Utils = Utils || new Common();
var Submissions = {
    excludeColumns: ["ip", "autoHide", "id"], // Fields to be hidden on submission display
    grid:false,
    properties: {},
    bbar:false,
    data:false,
    formID: false,
    lastPageNum:false,
    currentPageNum: 0,
    publicListing: false,
    pendingSubmissionCount: 0,
    pendingCount: 0,
    editMode: false,
    deleteType: 'all',
    columnCount: 0, //column count for excel
    userCanEdit: true,
    isSessionReset: false,

    decryptAnswer: function(answer) {
        if(answer.items) {
            // empty field
            if(answer.items.length == 0)
                return "";

            var value = "";
            var parts;
            switch(answer.type) {
                case "control_address":
                    parts = (answer.value || "").split("<br>");
                    for(var i=0; i < parts.length; i++) {
                        sub_parts = parts[i].split(": ");
                        if(sub_parts.length == 2 && sub_parts[0])
                            value += sub_parts[0] + ": " + JotEncrypted.decrypt(sub_parts[1]) + "<br>";
                    }
                    break;
                case "control_fullname":
                    parts = answer.items;
                    arrParts = [];
                    for(key in parts) {
                        if(typeof parts[key] === "string" && parts[key].length > 300)
                            arrParts.push(JotEncrypted.decrypt(parts[key]));
                    }
                    value = arrParts.join(" ");
                    break;
                case "control_datetime":
                case "control_birthdate":
                    parts = answer.items;
                    for(key in parts) {
                        if(typeof parts[key] === "string" && parts[key].length > 300)
                            parts[key] = JotEncrypted.decrypt(parts[key]);
                    }
                    if (answer.type == "control_birthdate") {
                        value = [];
                        for (key in parts) {
                            value.push(parts[key]);
                        }
                        value = value.join(" ");
                        break;
                    }
                    var datePart = (parts["day"] || '01') + '-' + (parts["month"] || '01') + '-' + (parts["year"]|| '2000');
                    var dateFormat = answer.format === "yyyymmdd" ? "$3" + answer.separator + "$2" + answer.separator + "$1" : "$2" + answer.separator + "$1" + answer.separator + "$3";

                    if (!!answer.format.match(/mmddyyyy|yyyymmdd/)) {
                        datePart = datePart.replace(/([0-9]{2})-([0-9]{2})-([0-9]{4})/g, dateFormat);
                    }
                    value = datePart + (parts["hour"]? " " + parts["hour"] + ":" + parts["min"] + " "+ parts["ampm"] : "");
                    break;
                case "control_time":
                    parts = answer.items;
                    for (var key in parts) {
                        if (typeof parts[key] === "string" && parts[key].length > 300) {
                            parts[key] = JotEncrypted.decrypt(parts[key]);
                        }
                    }
                    value = (parts["hourSelect"] || "00") + ":" + (parts["minuteSelect"] || "00") + " " + parts["ampm"];
                    break;
                case "control_phone":
                    parts = answer.items;
                    for(key in parts) {
                        if(typeof parts[key] === "string" && parts[key].length > 300)
                            parts[key] = JotEncrypted.decrypt(parts[key]);
                    }
                    if (parts["full"]) {
                        value = parts["full"];
                    } else {
                        value = (parts["country"]? "(" + parts["country"] + ") " : "") + "(" + parts["area"] + ") " + parts["phone"];
                    }
                    break;
                case "control_matrix":
                    var match,
                        matches = [],
                        pattern = /<td[^>]+>([^>]+)<\/td>/g;
                    while ((match = pattern.exec(answer.value)) !== null) {
                        matches.push(match[1]);
                    };
                    matches.forEach(function (m) {
                        if (m.length > 300) {
                            answer.value = answer.value.replace(m, JotEncrypted.decrypt(m));
                        }
                    });
                    return answer.value; // unencrypted table html
                case "control_mixed":
                    var subValues = answer.items;
                    for(var i in subValues) {
                        answer.value = answer.value.replace(subValues[i], JotEncrypted.decrypt(subValues[i]));
                    }
                    return answer.value;
                case "control_imagechoice":
                    var subValues = answer.items;
                    for(var i in subValues) {
                        if(typeof subValues[i] === 'string') {
                            var decryptedAnswer = JotEncrypted.decrypt(subValues[i]);
                            var answerParts = decryptedAnswer.split('|');
                            if(answerParts && answerParts.length === 2) {
                                answer.value = answer.value.replace(subValues[i], answerParts[0]);
                                // Due to image choice urls comes back same for every row, we cannnot use a global replacelement for url replacement
                                answer.value = answer.value.replace('href="https%3A%2F%2Ficons.jotfor.ms%2F"', 'href="' + answerParts[1] + '"');
                                answer.value = answer.value.replace('src="https%3A%2F%2Ficons.jotfor.ms%2F"', 'src="' + answerParts[1] + '"');
                            }
                        }
                    }
                    return answer.value;
                default:
                    parts = (answer.value || "").split("<br>");
                    for(var i=0; i < parts.length; i++) {
                        if(parts[i].length > 300)
                            parts[i] = JotEncrypted.decrypt(parts[i]);
                        value += parts[i] + (i < parts.length-1? "<br>": "");
                    }
            }
            return value;
        } else { // default
            parts = answer.value.split(" ");
            for(var i=0; i < parts.length; i++) {
                if(parts[i].length > 300)
                    parts[i] = JotEncrypted.decrypt(parts[i]);
            }
            var decryptedAnswer = parts.join(" ");
            // display smooth signature properly
            if (decryptedAnswer.indexOf('data:image/png;base64') == 0) {
                decryptedAnswer = '<img src="' + decryptedAnswer + '" style="max-width:100%; max-height:100%;">';
            }

            // Fix for textarea untitled markdown issue
            if(answer.type === 'control_textarea') {
                value = JotEncrypted.decrypt(answer.value);
                if (value.indexOf('jotform_untitled_markdown') !== -1) {
                   decryptedAnswer = value.replace('jotform_untitled_markdown', '');

                   // Create new div element and set the value
                   var textareaDiv = document.createElement('div');
                   textareaDiv.innerHTML = decryptedAnswer;

                   // Set the clean text area value
                   decryptedAnswer = textareaDiv.textContent;
                   
                   // Convert and set
                   if (window.showdown) {
                    var converter = new window.showdown.Converter();
                    decryptedAnswer = converter.makeHtml(decryptedAnswer); 
                   }
                }
            }
            return decryptedAnswer;
        }
    },

    decryptSubmissions: function(response) {
        var hasPerformance = false && typeof performance !== 'undefined';
        if('data' in response && JotEncrypted.getPrivateKey() !== null) {
            for(submissionIndex=0; submissionIndex < response.data.length; submissionIndex++ ) {
                var submission = response.data[submissionIndex];
                for (answerIndex in submission) { // expected ciphertext length ~ 344 for 2048 bit key
                    if(typeof submission[answerIndex] === "string" && submission[answerIndex].length > 300) {
                        var answer = {
                            value: submission[answerIndex] || "",
                            type : submission[answerIndex + "_type"],
                            items: submission[answerIndex + "_items"] || false,
                        };
                        // for datetime controls
                        if (submission[answerIndex + "_format"] && submission[answerIndex + "_separator"]) {
                            answer.format = submission[answerIndex + "_format"];
                            answer.separator = submission[answerIndex + "_separator"];
                        }
                        if (hasPerformance) {
                            start = performance.now();
                        }
                        submission[answerIndex] = this.decryptAnswer(answer);
                        if (hasPerformance) {
                            end = performance.now();
                            console.log("Decrypting took " + (end - start) + " milliseconds.")
                            console.log(answer);
                        }
                    }
                }
            }    
        }

        eval(response.callback)(response);
    },
    checkPrivateKey: function() {
        var $this = this;
        var privateKey = JotEncrypted.getPrivateKey();

        if ((privateKey === 'null' || !privateKey) && window.PriveteKeyWizardOpened !== true) {
            window.PriveteKeyWizardOpened = true;
            PriveteKeyWizard.open({
                onClose: function() {
                    $this.confirmPassword({
                        onSuccess: $this.storePrivateKey,
                    });
                },
            });
        } else {
            $this.confirmPassword({
                onSuccess: $this.storePrivateKey,
            });
        }
    },
    confirmPassword: function(options) {
        Utils.prompt(
            'In order to continue please enter your password.'.locale(),
            '',
            'Please enter your password'.locale(),
            function(pwd, button, continued, prompt) {
                if (!continued) {
                    window.location.href = '/myforms'
                }

                // Do not close the window if password is empty.
                if (continued && pwd.length <= 0) {
                    return false;
                }

                Utils.Request({
                    parameters: {
                        action: 'confirmPassword',
                        password: pwd,
                    },
                    onSuccess: function(res) {
                        var isValid = typeof res.valid !== 'undefined' && res.valid;
                        if (!isValid) { window.alert('Invalid password. You know the exit.'); }
                        if (typeof options.onSuccess !== 'undefined') {
                            options.onSuccess();
                        }
                        prompt.close();
                    },
                    onFail: function(res) {
                        console.log('confirmPassword.onFail', res);
                        prompt.close();
                    },
                });

                // Just keep the prompt open. We'll handle it.
                return false;
            },
            {
                okText: 'Continue'.locale(),
                cancelText: 'Back to My Forms'.locale(),
                placeholder: 'Password'.locale(),
                fieldType: 'password',
            }
        );
    },
    storePrivateKey: function() {
        if (typeof JotEncrypted === 'undefined') {
            console.error('JotEncrypted not found.');
            Utils.alert('Something went wrong! Please try again later.'.locale(), 'Error'.locale());
            return;
        }

        var privateKey = JotEncrypted.getPrivateKey();
        if (!privateKey || privateKey === 'null') {
            console.error('Private key not found.');
            Utils.alert('Something went wrong! Please try again later.'.locale(), 'Error'.locale());
            return;
        }

        Utils.Request({
            parameters: {
                action: 'storePrivateKey',
                privateKey: privateKey,
            },
            onSuccess: function(res) {
                window.location.reload();
            },
            onFail: function(res) {
                Utils.alert('Something went wrong! Please try again later.'.locale(), 'Error'.locale());
            },
        });
    },
    /**
     * Sets the submission viewer for print mode
     */
    print: function(){
        var template = "";
        template += '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">';
        template += '<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en" lang="en"><head>';
        template += '<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />';
        template += '<style>html, body{ height:100%; width:100%; margin:0px; padding:0px;overflow: visible; }</style>';
        template += '<base href="'+Utils.HTTP_URL+'" />';
        template += '<link rel="stylesheet" type="text/css" href="css/styles/form.css"/>';
        template += '<link rel="stylesheet" type="text/css" media="print" href="css/styles/form.css"/>';
        template += '<style>.form-section{overflow: visible !important; }</style>';
        template += '</head><body>';
        template += $('sub-content').innerHTML;
        template += '</body></html>';
        var iframe = new Element('iframe', {name:'print_frame', id:'print_frame'}).setStyle({height:'0px', width:'0px', border:'none'});
        $(document.body).insert(iframe);
        var frame = window.frames.print_frame;
        frame.document.write(template);
        frame.document.close();
        window.setTimeout(function(){
            frame.print();
            if($(frame).remove){
                $(frame).remove();    
            }
        }, 600);
        Submissions.sendWatchmanEvent('openPrintPreview');
        return false;
    },

    getSourceLink: function(){
       if(window.location.href.indexOf("https") == -1){
           return "http://cdn.jotfor.ms/";
       }else{
           return "https://cdn.jotfor.ms/";
       }
    },
    /**
     * Make submission flagged and update the image
     * @param {Object} id
     * @param {Object} img
     */
    flag: function(id, img){
        img.src = this.getSourceLink() + "images/flag.png";
        img.onclick = function(){ this.unflag(id, img); }.bind(this);
        this.setFlag(id, 1);

        Submissions.sendWatchmanEvent('flagSubmission');
    },
    /**
     * Make submission un-flagged and update the image
     * @param {Object} id
     * @param {Object} img
     */
    unflag: function(id, img){
        img.src = this.getSourceLink() + "images/flag-disable.png";
        img.onclick = function(){ this.flag(id, img); }.bind(this);
        this.setFlag(id, 0);
    },
    /**
     * Save the flag status onto database
     * @param {Object} id
     * @param {Object} value
     */
    setFlag: function(id, value){
        if(this.publicListing){return;}
        Utils.Request({
            parameters: {
                action:'setSubmissionFlag',
                sid: id,
                formID: this.data.formID,
                value: value
            }
        });
    },
    /**
     * convert submission HTML to email value
     * @param {Object} source
     */
    convertToEmail: function(source){
        source = source.replace(/class=\"form-line\"/gim, 'style="clear:both;padding: 5px;margin: 10px;"');
        source = source.replace(/class=\"form-all\"/gim, 'style="margin: 0px;margin-top:5px !important;"');
        source = source.replace(/class=\"form-section\"/gim, 'style="list-style: none;list-style-position: outside;padding:0;margin:0;"');
        source = source.replace(/class=\"form-input\"/gim, 'style="display:inline-block;"');
        source = source.replace(/class=\"form-label-left\"/gim, 'style="width: 150px;float: left;text-align: left;padding: 3px;"');
        source = source.replace(/src=\"images/gim, 'src="'+Utils.HTTP_URL+"images");
        source = source.replace(/class=\"form-matrix-row-headers\"/gim, 'style="border:1px solid #ccc;background:#ddd;padding:4px;"');
        source = source.replace(/class=\"form-matrix-column-headers\"/gim, 'style="border:1px solid #ccc;background:#ddd;padding:4px;"');
        source = source.replace(/class=\"form-matrix-values\"/gim, 'style="border:1px solid #ccc;background:#f5f5f5;padding:4px;"');
        source = source.replace(/class=\"form-matrix-table\"/gim, 'style="border-collapse:collapse;font-size:10px;"');
        return source;
    },
    /**
     * Mark submission as unread
     * @param {Object} id
     * @param {Object} img
     */
    makeUnread: function(id, img){
        img.src = this.getSourceLink() + "images/mail.png";
        img.onclick = function(){ /*this.makeRead(id, img)*/ }.bind(this);
        this.readStatus(id, 1);

        Submissions.sendWatchmanEvent('makeUnread');
    },
    /**
     * Mark submission as read
     * @param {Object} id
     * @param {Object} img
     */
    makeRead: function(id, img){
        img.src = this.getSourceLink() + "images/mail-open.png";
        img.onclick = function(){ this.makeUnread(id, img); }.bind(this);
        this.readStatus(id, 0);

        Submissions.sendWatchmanEvent('makeRead');
    },
    /**
     * Update the submission status on database
     * @param {Object} id
     * @param {Object} value
     */
    readStatus: function(id, value){
        if(this.publicListing){return;}
        Utils.Request({
            method: 'GET',
            parameters: {
                action:'setReadStatus',
                sid: id,
                formID: this.data.formID,
                value: value
            }
        });
    },
    /**
     * Cancel Edit
     */
    cancelEdit: function(){
        //remove function and its listener
        if (window.addEventListener){
            removeEventListener("message", submissionEdited, false)
        } else {
            detachEvent("onmessage", submissionEdited)
        }
        window.submissionEdited = false;
        this.editMode = false;
        this.displayRowData(this.getSelected());

        Submissions.sendWatchmanEvent('cancelEditForm');
    },
    /**
     * Open selected form in edit mode.
     */
    editForm: function(){
        this.editMode = true;
        if(this.publicListing){return;}
        //sc.insert(' <a href="'+ Utils.HTTP_URL+"form.php?mode=edit&formID="+$this.data.formID+"&sid="+selected.data.submission_id+'" target="_self">Edit link</a> ');
        var form = $$('.form-all')[0];
        //Emre: to hide prev/next button on edit page (58095)
        $$('.flip-holder img').invoke('hide');
        var height = $('sub-content').getHeight() - 30;
        form.hide();

        //Edit and delete buttons will not be in DOM if user does not have edit permissions
        if (this.userCanEdit) {
          $('edit-button', 'delete-button').invoke('hide');
        }

        $('cancel-button').show();
        var iframe = new Element('iframe', {src: Utils.HTTP_URL +"form.php?mode=inlineEdit&formID="+ this.data.formID +"&sid="+ this.getSelected().data.submission_id, frameborder:0 });
        iframe.setStyle({height: height+"px", width:'100%', border:'none' });
        form.insert({before: iframe});
        $$('#group-submissions button:not(#openPdfOptions)').invoke('disable');
        //add listener and its function
        window.submissionEdited = function(event){
            //check origin and recieved data
            if ( event.origin.indexOf('jotform') === -1 || event.data != 'edited') return;    
            Submissions.keepLastSelection = true;    
            Submissions.bbar.doRefresh();
        };
        if (window.addEventListener){
          addEventListener("message", window.submissionEdited, false)
        } else {
          attachEvent("onmessage", window.submissionEdited)
        }

        Submissions.sendWatchmanEvent('editFormClicked');
    },
    /**
     * Get current submission ID
     */
    getSubmissionID: function(){
        return this.getSelected().data.submission_id;
    },
    /**
     * Delete the submission by confirming the user
     */
    deleteSubmission: function(submission_id){
        if(this.publicListing){return;}
        var $this = this;
        
        var deleteSub = function(){
            Utils.Request({
                parameters:{
                    action:'deleteSubmission',
                    sid: (submission_id)? submission_id : $this.getSelected().data.submission_id,
                    formID: $this.data.formID
                },
                onSuccess: function(res){
                    $this.bbar.doRefresh();
                },
                onFail: function(res){
                    Utils.alert(res.error, "Error");
                }
            });
        };
        
        // If user selected to no dialog then don't show a dialog
        if(document.readCookie('dontShowDialog') == 'yes'){
            deleteSub();
            Submissions.sendWatchmanEvent('deleteSingleSubmissionConfirm');
            return;
        }
        
        // Display a dialog box by default
        Utils.confirm('<span style="font-size:16px;">'+
                          'Are you sure you want to delete this submission?'.locale() + 
                      '</span><hr><span style="color:#555; font-size:11px;"> '+
                          'This will also delete any uploaded files.'.locale()  +
                          "</br>" +
                          'Be careful, this process cannot be undone.'.locale() +
                      '</span><div style="margin-top:10px"> <label><input type="checkbox" id="dontshow"> ' +
                          "Don't show this message again.".locale() + 
                      ' </label></div>', 
            "Confirm".locale(),
            function(but, value){
                if(value){
                    if($('dontshow').checked){
                        document.createCookie('dontShowDialog', 'yes');
                    }
                    deleteSub();
                    Submissions.sendWatchmanEvent('deleteSingleSubmissionConfirm');
                } else {
                    Submissions.sendWatchmanEvent('deleteSingleSubmissionCancel');
                }
            }
        );
        if (submission_id) {

            Submissions.sendWatchmanEvent('deleteSingleSubmissionCrossButton');
        } else {

            Submissions.sendWatchmanEvent('deleteSingleSubmissionTrashButton');
        }
    },
    /**
     * Save the shown or hiddden field information to database
     */
    saveColumnSettings: function(){
        Utils.Request({
            method: 'GET',
            parameters:{
                action:'setSetting',
                identifier: this.data.formID,
                key:'columnSetting',
                value: Object.toJSON($A(this.excludeColumns).compact())
            },
            onFail: function(res){
                Utils.alert(res.error, "Error".locale());
            }
        });
    },
    /**
     * Read the setting from database
     * @param {Object} response
     */
    getColumnSettings: function(response){
        if(response.success){
            if(response.value && Object.isArray(response.value)){
                this.excludeColumns = response.value;
            }
        }
    },

    /**
     * Reads the properties of the form then converts it into an object
     * @param {Object} response
     */
    getFormProperties: function(response){
        var $this = this;

        // See if this document is viewing by public or not
        this.publicListing = document.publicListing;

        if(response.success === false && document.readCookie('try-reload') !== 'yes'){
            document.createCookie('try-reload', 'yes');
            setTimeout(function(){ location.reload(true); }, 10);
        }else if(response.success === false){
            Utils.alert('Cannot read form information. Try reloading the page. You will probably need to use a different browser (such as Firefox). There seems to be a bug with the Internet Explorer version you are using.');
        }else{
            document.eraseCookie('try-reload');
        }

        if(this.publicListing){
            $('settings').hide();
        }

        $H(response.form).each(function(prop){
            var qid = prop.key.split("_")[0];
            var key = prop.key.split("_")[1];
            var value = prop.value;
            qid = qid == "form"? qid : "q_"+qid;
            if(!$this.properties[qid]){
                $this.properties[qid] = {};
            }

            $this.properties[qid][key] = value;
        });

        this.formID = this.properties.form.id;
        document.title += (": "+window._htmlSanitizer.sanitizeHTML(this.properties.form.title));
        $('form-title').innerHTML += (": "+window._htmlSanitizer.sanitizeHTML(this.properties.form.title));

        if(this.hasPayment() && !this.publicListing){
            $('pendingButton').show().disable().observe('click', this.openPendingSubmissions.bind(this));
            if (this.paymentType === "control_stripe") {
                $$('#pendingButton .big-button-text')[0].innerHTML = "Pending Charges";
            }
            this.getPendingCount();
        }

        if (!this.publicListing) {
            this.getPendingSubmissionCount();
        }
    },
    /**
     * Gets the pending submission count for this form
     */
    getPendingCount: function(){

        Utils.Request({
            parameters:{
                action:'getPendingCount',
                formID:this.formID,
                type:'PAYMENT',
                paymentType: Submissions.paymentType
            },
            onSuccess: function(res){
                Submissions.pendingCount = res.total;
                if(res.total > 0){
                    $('pendingButton').enable().select('.button-img-wrap')[0].insert(
                        new Element('div', { className:'notify' }).insert('<div class="arrow"></div>').insert(res.total)
                    );
                }else{
                    $('pendingButton').disable().select('.notify').invoke('remove');
                }
            }
        });
        
    },
    getPendingSubmissionCount: function(){
        var self = this;
        Utils.Request({
            method:'GET',
            server: '/API/pendingsubmissions/' + this.formID,
            onComplete: function(res){
                Submissions.pendingSubmissionCount = res.content.size();
                if(Submissions.pendingSubmissionCount > 0) {
                    $('pendingSubmissionsButton').show().observe('click', self.openSavedSubmissions.bind(self));
                    
                    $('pendingSubmissionsButton').enable().select('.button-img-wrap')[0].insert(
                        new Element('div', { className:'notify' }).insert('<div class="arrow"></div>').insert(res.content.size())
                    );
                } else {
                    $('pendingSubmissionsButton').hide();
                }
            },
        });
    },
    
    /**
     * Creates pending submissions wizard
     */
    openPendingSubmissions: function(){
        Utils.loadScript('js/includes/pending_wizard.js', function(){ PendingWizard.openWizard(); });

        Submissions.sendWatchmanEvent('openPendingSubmissions');
    },

    openSavedSubmissions: function() {
        Utils.loadScript('js/includes/pending_submissions_wizard.js', function(){ PendingSubmissionsWizard.openWizard() });

        Submissions.sendWatchmanEvent('openSavedSubmissions');
    },
    
    /**
     * Check if the form has payment or not
     */
    hasPayment: function(){
        var has = false;
        $H(this.properties).each(function(pair){
            if(pair.value.type && [/* no pending for offline payment 'control_payment',*/ 'control_paypalexpress', 'control_paypal', 'control_paypalpro', 'control_clickbank', 'control_2co', 'control_worldpay', 'control_googleco', 'control_onebip', 'control_authnet', 'control_stripe', 'control_payu', 'control_sofort', 'control_skrill', 'control_gocardless', 'control_paypalcomplete'].include(pair.value.type)){
                Submissions.paymentType = pair.value.type;
                Submissions.paymentFieldID = pair.key.replace(/q_/, "");
                has = true;
                throw $break;
            }
        });
        return has;
    },
    /**
     * Check if the form has uploads or not
     */
    hasUpload: function(){
        var has = false;
        $H(this.properties).each(function(pair){
            if(pair.value.type && (pair.value.type == 'control_fileupload' || pair.value.type == 'control_newfileupload')){
                has = true;
                throw $break;
            }
        });
        return has;
    },
    /**
     * Cheks if the form has given type of control
     * @param {Object} type
     */
    hasQuestion: function(type){
        var has = false;
        var arr = Object.isArray(type);
        $H(this.properties).each(function(pair){
            if(arr){
                if(pair.value.type && type.include(pair.value.type)){
                    has = true;
                    throw $break;
                }
            }else{
                if(pair.value.type && pair.value.type == 'control_'+type){
                    has = true;
                    throw $break;
                }
            }
            
        });
        return has;
    },
    /**
     * Opens or closes the public setting for this page
     * @param {Object} status
     */
    togglePublicSettings: function(status, callback){
        var $this = this;
        if(status == 'open'){
            Utils.prompt(
                'In order to make this page public you must first set a password.'.locale(),
                'Enter a password'.locale(),
                'Set Password'.locale(),
                function(value, but, ok){
                    if(ok){
                        Utils.Request({
                            parameters:{
                                action:'submissionPublicPassword',
                                type:'add',
                                formID: $this.data.formID,
                                password:value
                            },
                            onSuccess: function(){
                                
                                Utils.alert(
                                    '<b>' + 'This page is public now.'.locale() + '</b><br><br>'+
                                    'You can share this page with your friends or colleagues.'.locale() + '<br>'+
                                    '<input onclick="this.select();" type="text" readonly value="'+location.href+'" style="font-size:14px; width:98%; text-align:center; padding:5px; margin:14px 0 0; background:white; display:inline-block;border:1px solid #ccc;">', 'Public URL'.locale(), false, {
                                        width:450
                                    });
                                callback();
                                
                            }, onFail: function(res){
                                Utils.alert(res.error, 'Error');
                            }
                        });
                    }
                }, {
                    //fieldType:'password',
                    width:400
                }
            );
        }else{
            Utils.confirm('Are you sure you want to remove public password?'.locale(), 'Are You Sure?'.locale(), function(button, val){
                if(val){
                    Utils.Request({
                        parameters: {
                            action:'submissionPublicPassword',
                            type:'remove',
                            formID: $this.data.formID
                        },
                        onSuccess: function(){
                            callback();
                        }, onFail: function(res){
                            Utils.alert(res.error, 'Error');
                        }
                    });
                    
                }
            });
        }
    },
    /**
     * 
     * @param {Object} dataIndex
     * @param {Object} value
     */
    hideShowGridColumn: function(dataIndex, value){
        try{
            var $this = this;
            var cm = this.grid.getColumnModel();
            var index = cm.findColumnIndex(dataIndex);
            if(index == -1){return;}
            //count columns for excel
            if(value)
                $this.columnCount--;
            else
                $this.columnCount++;
            cm.setHidden(index, value);
        }catch(e){}
    },
    
    logout: function(){
        location.href = location.href+"&logout";
    },
    /**
     * Open/close the settings page
     */
    toggleSettings: function(){
        var $this = this;
        var setting_menu_elem = $('setting-menu');
        if ( setting_menu_elem ) {
            setting_menu_elem.remove();
            $this.saveColumnSettings();

            Submissions.sendWatchmanEvent('settingsMenuClosed');
            return false;
        }

        Submissions.sendWatchmanEvent('settingsMenuOpened');
        
        var div = new Element('div', {id:'setting-menu'});

        div.insert('<b style="display:block;padding:4px;color:#E19913">' + 'Time Frame:'.locale() + '</b>');
        
        var custom = $this.getCustomDate();
        customText = 'Custom Time Frame'.locale();
        if(custom){
            customText = "Custom: %s - %s".locale(custom.start, custom.end);
        }
        
        var selected = $this.getDateRange();
        
        var tf = new Element('select', {id:'time-frame'});
        var tf_options = $H({'all':'All Time'.locale(), 'today':'Today'.locale(), 'week':'This Week (Mon-Sun)'.locale(), 'month':'This Month (1st-31st)'.locale(), 'lastmonth':'Last Month (1st-31st)'.locale(), 'year':'This Year(Jan 1st-dec 31st)'.locale(), 'custom': customText});
        
        tf_options.each(function(el){
            tf.insert(new Element("option", {
              value: el.key,
              selected: el.key == selected
            }).insert(el.value));
        });
        
        tf.onchange = function(){
            if(tf.value == "custom"){
                Utils.alert(
                
                    // Contents of the window
                    '<table class="date-range-table" height="100%" width="320"><tr><th colspan="2">'+
                    'Select a date range for form responses'.locale()+
                    '</th></tr><tr><td>'+'Start Date'.locale()+':</td><td>'+'End Date'.locale()+':</td></tr>'+
                    '<tr><td><div id="fromdate"></div></td>'+
                    '<td><div id="todate"></div></td>'+
                    '</tr></table><div id="date-error">&nbsp;</div>',
                    
                    // Title of the window
                    'Select a Date Range'.locale(),
                    
                    // Function to run when OK button is clicked
                    function(){
                        $('date-error').update("&nbsp;");
                        
                        var startdate = Ext.get('startdt').getValue(); 
                        var enddate   = Ext.get('enddt').getValue();
                        if(startdate === ""){
                            $('date-error').update("Please select a <b>start</b> date".locale());
                            return false;
                        }
                        if (enddate === "") {
                            $('date-error').update("Please select an <b>end</b> date".locale());
                            return false;
                        }
                        
                        var frametext = "Custom: %s - %s".locale(startdate, enddate);
                        
                        tf.getSelected().text = frametext;
                        tf.bigSelect();
                        $this.saveCustomDate(startdate, enddate);
                        $this.setDateRange(startdate, enddate);
                    },
                    
                    // Options for prompt window
                    {
                        width:340,
                        onInsert: function(){
                            if(custom){
                                $this.createRangePicker(custom.start, custom.end);
                            }else{
                                $this.createRangePicker();
                            }
                            
                        }
                    }
                );
            }else{
                $this.setDateRange(tf.value);
            }

            setTimeout(function() {
                $this.setDeleteType();
                $this.setDownloadType();
            },1000);



            Submissions.sendWatchmanEvent('settingsTimeFrameChanged');
            Submissions.sendWatchmanEvent('headerTimeRangeChangeClicked', tf.value);
        };
        
        div.insert(tf);
        
        tf.bigSelect();
        
        div.insert('<b style="display:block;padding:4px;color:#E19913">' + 'Fields:'.locale() + '</b>');
        
        var list = new Element('div', {className:'field-list'});
        
        $A($this.data.columns).each(function(column){
            
            if(["flag", "new", "del"].include(column.dataIndex)){ return; /* continue; */  }
            
            var li = new Element('li', {className: 'list-element'});
            
            if(!$this.excludeColumns.include(column.dataIndex)){
                li.addClassName('element-selected');
	        }
            
            li.insert(column.header.stripTags().shorten(25));
            li.onclick = function(){
                if(!li.hasClassName('element-selected')){
                    li.addClassName('element-selected');
                    $this.excludeColumns = $this.excludeColumns.without(column.dataIndex);
                    if(column.header.stripTags() == "IP"){
                        $this.excludeColumns.push("showIP");
                    }
                    Submissions.sendWatchmanEvent('sheetQuestionAdded');
                }else{
                    li.removeClassName('element-selected');
                    $this.excludeColumns.push(column.dataIndex);
                    if(column.header.stripTags() == "IP"){
                        $this.excludeColumns = $this.excludeColumns.without("showIP");
                    }
                    Submissions.sendWatchmanEvent('sheetQuestionRemoved');
                }                
                $this.displayRowData($this.getSelected());
                $this.saveColumnSettings();
            };
            list.insert(li);
        });
        div.insert(list);
        list.softScroll();
        div.insert('<b style="display:block;padding:4px;color:#E19913;margin-top:4px;">' + 'Options:'.locale() + '</b>');
        var optionsList = new Element('div', {className:'options-list'});
        
        
        var autoHide = new Element('li', {className: 'list-element'});
        if ($this.excludeColumns.include('autoHide')) {
            autoHide.addClassName('element-selected');
        }
        
        autoHide.insert("Auto Hide Empty Fields".locale());//.setStyle('border-bottom:1px solid #aaa;border-top:1px solid #aaa;padding-top:3px;padding-bottom:3px;');
        
        optionsList.insert(autoHide);
        autoHide.onclick = function(){
            if($this.excludeColumns.include('autoHide')){
                autoHide.removeClassName('element-selected');
                $this.excludeColumns = $this.excludeColumns.without("autoHide");
                Submissions.sendWatchmanEvent('settingsResetAutoHideEmptyFields');
            }else{
                $this.excludeColumns.push("autoHide");
                autoHide.addClassName('element-selected');
                Submissions.sendWatchmanEvent('settingsSetAutoHideEmptyFields');
            }
            $this.displayRowData($this.getSelected());
            $this.saveColumnSettings();


        };
        
        if($this.hasQuestion(['control_head', 'control_collapse', 'control_text', 'control_image'])){
            var showNonInputs = new Element('li', {className: 'list-element'});
            if ($this.excludeColumns.include('showNonInputs')) {
                showNonInputs.addClassName('element-selected');
            }
            
            showNonInputs.insert("Show Headers and Texts".locale());
            
            optionsList.insert(showNonInputs);
            showNonInputs.onclick = function(){
                if($this.excludeColumns.include('showNonInputs')){
                    showNonInputs.removeClassName('element-selected');
                    $this.excludeColumns = $this.excludeColumns.without("showNonInputs");
                    Submissions.sendWatchmanEvent('settingsResetShowHeadersAndTexts');
                }else{
                    showNonInputs.addClassName('element-selected');
                    $this.excludeColumns.push("showNonInputs");
                    Submissions.sendWatchmanEvent('settingsSetShowHeadersAndTexts');
                }
                $this.displayRowData($this.getSelected());
                $this.saveColumnSettings();

            };
        }
        
        if($this.hasQuestion('address')){
            // showMaps was decided previously based on "noMaps" existing in
            // excludeColumns. Later, it was decided that maps should be
            // disabled by default, which required removing "noMaps" from db
            // for every form. Instead of that, I changed "noMaps" to
            // "showMaps". There are still "noMaps" entries in db, but it has no
            // effect anymore.
            var showMaps = new Element('li', {className: 'list-element'});
            if ($this.excludeColumns.include('showMaps')) {
                showMaps.addClassName('element-selected');
            }
            
            showMaps.insert("Show Addresses On Map".locale());
            optionsList.insert(showMaps);
            showMaps.onclick = function(){
                if ($this.excludeColumns.include('showMaps')) {
                    // removing selection when showMaps exists in excludeColumns
                    // might feel counter intuitive and confusing. That is
                    // because excludeColumns is not an exclusion list anymore.
                    // Check above comment for why it is used like this now.
                    showMaps.removeClassName('element-selected');
                    $this.excludeColumns = $this.excludeColumns.without('showMaps');
                    Submissions.sendWatchmanEvent('settingsSetShowAddressesOnMap');
                } else {
                    showMaps.addClassName('element-selected');
                    $this.excludeColumns.push('showMaps');
                    Submissions.sendWatchmanEvent('settingsResetShowAddressesOnMap');
                }
                $this.displayRowData($this.getSelected());
                $this.saveColumnSettings();

            };

            var showAddressLabels = new Element('li', {className: 'list-element'});
            if ($this.excludeColumns.include('showAddressLabels')) {
                showAddressLabels.addClassName('element-selected');
            }
            showAddressLabels.insert("Show Address Labels in PDF".locale());
            optionsList.insert(showAddressLabels);
            showAddressLabels.onclick = function(){
                if($this.excludeColumns.include('showAddressLabels')){
                    showAddressLabels.removeClassName('element-selected');
                    $this.excludeColumns = $this.excludeColumns.without("showAddressLabels");
                    Submissions.sendWatchmanEvent('settingsResetShowAddressLabelsInPDF');
                }else{
                    showAddressLabels.addClassName('element-selected');
                    $this.excludeColumns.push("showAddressLabels");
                    Submissions.sendWatchmanEvent('settingsSetShowAddressLabelsInPDF');
                }
                $this.displayRowData($this.getSelected());
                $this.saveColumnSettings();

            };
        }
        
        
        var publicList = new Element('li', {className: 'list-element'});
        if ($this.excludeColumns.include('publicList')) {
            publicList.addClassName('element-selected');
        }
        
        publicList.insert("Make This Page Public".locale());
        
        optionsList.insert(publicList);
        publicList.onclick = function(){
            if($this.excludeColumns.include('publicList')){
                $this.togglePublicSettings('close', function(){
                    publicList.removeClassName('element-selected');
                    $this.excludeColumns = $this.excludeColumns.without("publicList");
                    $this.saveColumnSettings();
                    Submissions.sendWatchmanEvent('settingsResetMakeThisPagePublic');
                });
            }else{
                $this.togglePublicSettings('open', function(){
                    publicList.addClassName('element-selected');
                    $this.excludeColumns.push("publicList");
                    $this.saveColumnSettings();
                    Submissions.sendWatchmanEvent('settingsSetMakeThisPagePublic');
                });
            }

        };
        
        
        var ftpButton = new Element('li', {className: 'list-element', id:'ftpButton-check'}).update('' + 'Send Uploads to FTP'.locale());
        if(this.FTPIntegrated){
            ftpButton.addClassName('element-selected');
        }
        
        if (!$this.hasUpload()) {
            ftpButton.setStyle('text-decoration:line-through; opacity:0.5');
            ftpButton.title = "Upload field is needed".locale();
        }
        
        ftpButton.onclick = function(){
            if(!$this.hasUpload()){
                Utils.alert("An upload field is required for this integration.".locale(), "Notification!".locale());
            }else{
                Submissions.FTPIntegration();
            }

            Submissions.sendWatchmanEvent('settingsFTPButton');
        };
        optionsList.insert(ftpButton);
        
        div.insert(optionsList);
        $('settings').insert(div);
    },
    
    FTPIntegration: function(){
        var $this = this;
        Utils.loadCSS('css/wizards/FTP_wizard.css');
        Utils.require('js/wizards/FTP_wizard.js', function(){
            FTPWizard.openWizard($this.data.formID, Utils.user.username, $this.FTPProps);
        });
    },
    
    /**
     * Opens dropbox options wizard.
     */
    integrationOptions: function(first, type){
        var $this = this;
        var div = new Element('div');
        var strMsgs = {
            readyStr : "Dropbox Integration is ready".locale(),
            selectStr : "Select a field to name your upload folders.".locale(),
            orgStr : "This will let you easily find/organize the uploads on your folder.<br/>Result: Folder Name - Extended Folder Name".locale(),
            titleStr : "Configure Dropbox".locale(),
            spanCustomPath : 'Create your own folder tree level. You can also attach the<br>Submission ID by writing<br><b>{SID}</b> <i>e.g <b>dirA/dirB-{SID}</b></i>'.locale()
        };
        
        if ( first ) {
            div.setStyle({
                'text-align' : 'center'
            }).insert(
                '<h2 style="line-height:30px; font-size:14px;">'+
                    '<img src="images/success_small.png" align="absmiddle" />'+
                    strMsgs.readyStr +
                '</h2>'
            );
        }
        else
        {
            Utils.alert('<p style="text-align: justify;">Integrating to Dropbox using this wizard is no longer working. Dropbox Integration is now located in the Integrations Wizard on the <a href="/?formID='+$this.data.formID+'" style="color: #757575;">Form Builder (Edit mode)</a>.<br /><br />This <a style="color: #757575;" href="http://www.jotform.com/help/77-Upload-to-Dropbox-with-JotForm" target="_self" title="New process">new process</a> will help you properly send submissions to your Dropbox account.<br/><br/>Sorry for the inconvenience.&nbsp;</p><br/>','Alert!!');
            return false;
            div.insert(
                '<p style="color: #FF5959;">Warning: This wizard will be move to Dropbox Integration on <a href="/" style="color: #757575;">Form Builder</a>  soon, if you\'re having a problem re-integrating we recommend to use the <a style="color: #757575;" href="/wizards/dropboxWizard/newintegration.png" target="_self" title="New process">new process</a> as this wizard will sometimes fail.&nbsp;</p><br/>' +
                '<p>'+
                    '<span style="font-size:13px;">' + strMsgs.selectStr + '</span>'+
                    '<br>'+
                    '<span style="color:#777; font-size:10px;">' + strMsgs.orgStr + '</span>'+
                '</p>'+
                '<br>'
            );

            var folderDefault = ['none','nofolder','Use Default - Submission ID'.locale(),'No Folder'.locale()];

            var dropdown = new Element('select', {id:'dropdown1field'})
                            .insert(new Element('option', {value:folderDefault[0]}).update(folderDefault[2]))
                            .insert(new Element('option', {value:folderDefault[1]}).update(folderDefault[3]));

            //put a click event on the first dropdown
            dropdown.observe('change', function(){
                //set 2nd dropdown to no folder automatically
                var d1 = this, d2 = $('dropdown2field');
                if ( d2 )
                {
                    var thisVal = d1.getValue();
                    if ( thisVal == 'nofolder' ) {
                        d2.setValue( thisVal );
                    }
                }
            });
            
            $H(this.properties).each(function(prop){
                if(prop.value.type && ['control_textbox', 'control_autocomp', 'control_email', 'control_radio', 'control_dropdown', 'control_fullname', 'control_hidden', 'control_autoincrement'].include(prop.value.type)){
                    dropdown.insert(new Element('option', {value:prop.value.qid}).update(prop.value.text.shorten('20')));
                }
            });
            // 2nd dropdown field
            var dropdown2 = new Element('select', {id:'dropdown2field'})
                            .insert(new Element('option', {value:folderDefault[0]}).update(folderDefault[2]))
                            .insert(new Element('option', {value:folderDefault[1]}).update(folderDefault[3]));

            //put a click event on the second dropdown
            dropdown2.observe('change', function(){
                //check 1st dropdown if no folder, then set this as no folder aswell
                var d1 = $('dropdown1field'), d2 = this;
                if ( d1 )
                {
                    var thatVal = d1.getValue();
                    if ( thatVal == 'nofolder' ) {
                        d2.setValue( thatVal );
                    }
                }
            });
            
            $H(this.properties).each(function(prop){
                if(prop.value.type && ['control_textbox', 'control_autocomp', 'control_email', 'control_radio', 'control_dropdown', 'control_fullname', 'control_hidden', 'control_autoincrement'].include(prop.value.type)){
                    dropdown2.insert(new Element('option', {value:prop.value.qid}).update(prop.value.text.shorten('20')));
                }
            });
            
            var folderField = [];
            if ( $this.dropboxFolderField.hasOwnProperty('rootF') )
            {
                //new version 2
                folderField = [$this.dropboxFolderField.submissionF, $this.dropboxFolderField.extendedF];
            }
            else
            {
                folderField = ( ( $this.dropboxFolderField !== false && ( $this.dropboxFolderField && $this.dropboxFolderField.match(/-/) ) ) ? String($this.dropboxFolderField).split(" - ") : folderDefault );
            }

            //insert selected option to the div
            dropdown.selectOption( folderField[0] );
            var trA = new Element('tr').insert( new Element('td', {width:"45%"}).update('Folder Name'.locale()) ).insert( new Element('td', {width:"45%"}).insert( dropdown ) );
            
            dropdown2.selectOption(folderField[1]);
            var trB = new Element('tr').insert( new Element('td', {width:"45%"}).update('Extend Folder Name'.locale()) ).insert( new Element('td', {width:"45%"}).insert( dropdown2 ) );

            var table = new Element('table').insert( new Element('tbody').insert( trA ).insert( trB ) );

            div.insert( table );
        }
        
        var requestType = type;
        document.window({
            title: strMsgs.titleStr,
            content: div, width:400,
            modal: true, contentPadding: 15,
            buttons: [{
                title: "Remove Integration".locale(),
                hidden: first, align:'left',
                handler: function(w){
                    Utils.Request({
                        parameters: {
                            action: 'removeIntegration',
                            type: requestType,
                            username: Utils.user.username,
                            formID: $this.data.formID
                        },
                        onSuccess: function(){
                            if($(requestType + '-check')){
                                $(requestType + '-check').removeClassName('element-selected');
                            }

                            //set to null or empty
                            if ( requestType === "dropbox" )
                            {
                                $this.dropboxFolderField = false;
                                $this.dropboxIntegrated = false;
                            }

                            //close wizard
                            w.close();                            
                        }, onFail: function(res){
                            Utils.alert(res.error, 'Error!'.locale());
                        }
                    });
                }
            },{
                title:'Complete'.locale(),
                handler: function(w){
                    if ( first === false )
                    {
                        var requestVal = dropdown.value + " - " + dropdown2.value;
                        
                        Utils.Request({
                            parameters:{
                                action:'setIntegrationProperties',
                                type:requestType,
                                username: Utils.user.username,
                                formID: $this.data.formID,
                                props: Object.toJSON({
                                    folder_field: requestVal,
                                    version: 1
                                })
                            },
                            onSuccess: function(res){
                                if ( requestType === "dropbox" ) {
                                    $this.dropboxFolderField = requestVal;
                                }
                                
                                w.close();
                            },
                            onFail: function(res){
                                Utils.alert(res.error, 'Error:');
                            }
                        });
                    } else {
                        w.close();
                    }
                }
            }]
        });
    },
    /**
     * Complete the dropbox integration
     * @param {Object} status
     */
    dropbox: function(status){
        if(status){
            this.dropboxIntegrated = true;
            this.integrationOptions(true, 'dropbox');

            if(window.integrations) {
                window.integrations['dropbox'] = true;
            }
        }
    },
    /**
     * Display previous submission and update the grid
     */
    prevRow: function (){
        var sm = this.grid.getSelectionModel();
        if(!sm.hasSelection()){
            sm.selectLastRow();
        }else{
            if (sm.hasPrevious()) {
                sm.selectPrevious();
            } else {
                if(this.bbar.getPageData().activePage != 1){
                    this.bbar.movePrevious();
                } 
            }
        }
        Submissions.scrollPreviewToTop();


        Submissions.sendWatchmanEvent('navigateToPrevSubmission');
    },
    /**
     * Scroll preview on top when selected
     */
    scrollPreviewToTop: function() {
        if (Prototype.Browser.Gecko) {
            window.scroll(0,60);
        } else {
            setTimeout(function() { 
                window.scroll(0,60); 
            }, 10);
        }
    },
    
    /**
     * Display next submission and update the grid
     */
    nextRow: function (){
        var sm = this.grid.getSelectionModel();
        if(!sm.hasSelection()){
            sm.selectFirstRow();
        }else{
            if(sm.hasNext()){
                sm.selectNext();
            }else{
                if(this.bbar.getPageData().pages != this.bbar.getPageData().activePage){
                    this.bbar.moveNext();
                }
            }
        }
        Submissions.scrollPreviewToTop();


        Submissions.sendWatchmanEvent('navigateToNextSubmission');
    },
    /**
     * Get the header by question ID
     * @param {Object} key
     */
    getHeader: function (key){
        var head = $A(this.data.columns).collect(function(v){ if(v.dataIndex == key){ return v; } }).compact()[0];       
        return head && head.header;
    },
    /**
     * Cleans the value from XSS and display problems
     * @param {Object} value
     */
    cleanValue: function (value){
        value = value || "";
        // for charge later links (payment)
        if (value.match(/id=\'[a-z]+Charge\'/)) {
            value = value.replace('prompt', 'confirm');
        }
        value = value.stripScripts();
        value = value.replace(/\n/gim, "<br>");
        //value = value.stripslashes();
        value = value.replace(/  /gim, " &nbsp;");
        return value;
    },
    
    getColumn: function(id){
        var c = this.data.columns;
        for(var x=0; x<c.length; x++){
            if(c[x].dataIndex == id){
                return c[x];
            }
        }
    },
    
    /**
     * Replace {fieldTag} references with that field's value
     */
    getTagValues: function(label) {
        var props = Submissions.properties;
        var data = Submissions.getSelected().data;
        if(label.indexOf("{") > -1 && label.indexOf("}") > -1) {
            label = label.replace(/\{.*?\}/gi, function (match, contents, offset, s) {
                var stripped = match.replace(/[\{\}]/g, "");
                var defaultValue = "";
                if (stripped.indexOf("[") > -1) {
                    defaultValue = stripped.split("[")[1];
                    defaultValue = defaultValue.substring(0, defaultValue.length - 1);
                    stripped = stripped.split("[")[0];
                }

                for(key in props) {
                    if(!key || typeof key !== "string" || key==="form") continue;
                    if(props[key].name === stripped) {
                        var k = key.replace(/q_/,'');
                        if(!data[k] || data[k] === "") {
                            return defaultValue;
                        } 
                        return data[key.replace(/q_/,'')];
                    }
                }
                return match;
            });
        }
        return label;
    },

    /**
     * Displays the currently selected row in display area
     * @param {Object} selected
     */
    displayRowData: function (selected) {
        this.editMode = false;

        // If nothing is selected do nothing.
        if(!selected.data){ return; }

        $$('#group-submissions button:not(#openPdfOptions)').invoke('enable');
        //Emre: to hide prev/next button on edit page (58095)
        $$('.flip-holder img').invoke('show');

        //Edit and delete buttons will not be in DOm if user does not have edit permissions
        if(this.userCanEdit) {
          $('edit-button', 'delete-button').invoke('show');
        }
        $('cancel-button').hide();
        var $this = this;
        var sc = $('sub-content').update(); 
        var emails = [], ul;
        var chargeLaterData = {};
        
        var hideEmpty = $this.excludeColumns.include("autoHide");
        var showMaps  = $this.excludeColumns.include("showMaps");
        var showNonInputs = $this.excludeColumns.include("showNonInputs");
        var nonInput = false;
        
        if($('img-'+selected.data.submission_id).src.include("mail.png")){
            $this.makeRead(selected.data.submission_id, $('img-'+selected.data.submission_id));
        }
        
        sc.insert(new Element('div', {className:'form-all'}).insert(ul = new Element('ul', {className:'form-section'})));
        
        /**
         * Will process each field and display on the page
         * @param {Object} qprop
         */
        var processField = function(qprop){
            $this.columnCount++;
            nonInput = false;
            var column;
            if(Object.isString(qprop)){
                column = $this.getColumn(qprop); 
            }else{
                if(qprop.key == "form"){return;}
                column = $this.getColumn(qprop.value.qid);
                if(!column){
                    nonInput = true;
                    column = {
                        dataIndex: qprop.value.qid,
                        header: qprop.value.text || ""
                    };
                }
            }

            qprop = $this.properties["q_" + column.dataIndex];
            var key = column.dataIndex;
            var value = selected.data[key] || "";
            var type = selected.json[key + "_type"] || (qprop && qprop.type) || "";
            var head = !!column.header ? $this.getTagValues(column.header.stripslashes()) : '';
            var items = selected.json[key + "_items"];

            if ($this.properties.form.isEncrypted === 'Yes') {
               if (typeof JotEncrypted !== "undefined") {
                    if (JotEncrypted.getPrivateKey() === null && window.PriveteKeyWizardOpened !== true) {
                        window.PriveteKeyWizardOpened = true;
                        PriveteKeyWizard.open({
                            onClose: function() {
                                window.location.reload()
                            }
                        });
                    } else {
                        if (typeof value === "string" && value.length > 300) {
                            value = JotEncrypted.decrypt(value);
                        }
                        if (typeof items != "undefined") {
                            for (i in items) {
                                if (typeof items[i] === "string" && items[i].length > 300) {
                                    items[i] = JotEncrypted.decrypt(items[i]);
                                }
                            }
                        }
                    }
                }
            }


            if(["control_pagebreak", "control_button", "control_captcha","control_separator", "control_clear"].include(type)){ return; /* continue; */ }
            if(!nonInput && hideEmpty && value.strip() === "" && type != "control_time"){ return; /* continue; */ }
            // empty phone values are recorded as "()" in database. Check Submission::fixValue function in Submission.php
            if(!nonInput && hideEmpty && type === "control_phone" && value.strip() === "()"){ return; }
            
            if (['control_paypalcomplete'].include(type)) {
                var prettifyName = type.replace('control_', '');
                var dashboardURL = "";
                var transactionId = "";
                var sandbox = "";
                // We can forward the user to related gateway dashboard if the merchant wants to see.

                switch (type) {
                    case 'control_paypalcomplete':
                        sandbox = (items.paymentArray && items.paymentArray[prettifyName + "Data"]) && items.paymentArray[prettifyName + "Data"].sandboxMode;
                        var baseURL = sandbox ? "https://www.sandbox.paypal.com" : "https://www.paypal.com";
                        transactionId = (items.paymentArray && items.paymentArray[prettifyName + "Data"]) && items.paymentArray[prettifyName + "Data"].transactionId;
                        dashboardURL = baseURL + "/activity/payment/" + transactionId;
                    break;
                }

                chargeLaterData = {
                    'qid': key,
                    'sid': selected.data.submission_id,
                    'formId': $this.data.formID,
                    'product': items.paymentArray && items.paymentArray.product,
                    'amount': items.paymentArray && items.paymentArray.total,
                    'currency': items.paymentArray && items.paymentArray.currency,
                    'date': selected.json && selected.json.created_at,
                    'dashboardURL': dashboardURL,
                    'transactionId': transactionId,
                    'sandbox': sandbox,
                    'gateway': type
                };
            }
            
            if(Utils.checkEmailFormat(value)){
                $A(Utils.checkEmailFormat(value)).each(function(e){
                    emails.push(e);
                });
            }
            
            if(["flag", "new", "del"].include(key)){ return; /* continue;*/  }
            var lineClass = 'form-line';
            var labelClass = 'form-label-left';
            var inputClass = 'form-input';
            var labelWidth = 'style="width:150px" ';
            
            if($this.properties.form.labelWidth){
            	//Emre: to prevent css problem (39968)
            	if($this.properties.form.labelWidth != 0){
            		labelWidth = 'style="width:'+$this.properties.form.labelWidth+'px;" ';
            	}else{
            		labelWidth = 'style="" ';
            	}
            }
            
            if($this.properties.form.alignment == 'Top'){
                labelClass = 'form-label-top';
                inputClass = 'form-input-wide';
            }
            
            if($this.properties.form.alignment == 'Right'){
                labelClass = 'form-label-right';
                inputClass = 'form-input';
            }
            
            if(qprop){
                if(qprop.labelAlign != 'Auto'){
                    if(qprop.labelAlign == 'Top'){
                        labelClass = 'form-label-top';
                        inputClass = 'form-input-wide';
                    }
                    
                    if(qprop.labelAlign == 'Right'){
                        labelClass = 'form-label-right';
                        inputClass = 'form-input';
                    }
                    
                    if(qprop.labelAlign == 'Left'){
                        labelClass = 'form-label-left';
                        inputClass = 'form-input';
                    }
                }
            }
            if(labelClass == 'form-label-top'){
                labelWidth = ''; 
            }

            if($this.excludeColumns.include(key)){ $this.hideShowGridColumn(key, true);  return; /* continue;*/  }
            $this.hideShowGridColumn(key, false);

            var val;
            switch(type){
                case "control_collapse":
                case "control_head":
                    if(!showNonInputs){return; /* continue; */}
                    var ht = "h2";
                    if (qprop.headerType == "Large") {
                        ht = 'h1';
                    } else if (qprop.headerType == "Small") {
                        ht = 'h3';
                    }
                    var h = '<li class="form-input-wide"><div class="form-header-group">';
                    h += '<'+ht+' class="form-header">' + head + "</"+ht+">";
                    if(qprop.subHeader){
                        h += '<div class="form-subHeader">'+qprop.subHeader+'</div>';
                    }
                    h += '</div></li>';
                    
                    ul.insert(h);
                break;
                case "control_image":
                    if(!showNonInputs){return; /* continue; */}
                    var html = "";
                    var imgAlt = "";
                    var src = qprop.src;
                    html += '<img alt="" ' + imgAlt + ' class="form-image" border="0" src="' + src + '" height="' + qprop.height + '" width="' + qprop.width + '" />';
                    
                    if (qprop.align == "Center") {
                        html = '<div style="text-align:center;">' + html + '</div>';
                    }
                    if (qprop.align == "Right") {
                        html = '<div style="text-align:right;">' + html + '</div>';
                    }

                    ul.insert('<li class="form-line">'+html+'</li>');
                break;
                case "control_text":
                    if(!showNonInputs){return; /* continue; */}
                    if(qprop.text === undefined){return; /* continue; */}
                    ul.insert('<li class="form-line"><div class="form-input-wide">'+$this.getTagValues(qprop.text)+'</div></div></li>');
                break;
                case "control_checkbox":
                    if(!items){ 

                        if (hideEmpty) {

                            return; /* continue; */ 
                        }
                        items = []; 
                    }
                    // If checkbox has 'other' option, convert items (object) to array
                    if (typeof items == 'object') {
                        var newItems = [];
                        for (var ii in items) {
                            if (items.hasOwnProperty(ii)) {
                              newItems.push(items[ii]);   
                            }
                        }
                        items = newItems;
                    }
                    val = "<ul style='list-style: disc inside'><li>"+ (items.join("</li><li>")).stripslashes() +"</li><ul>";
                    if(items.length === 0){ val = "-"; }
                    ul.insert('<li class="'+lineClass+'"><label '+labelWidth+'class="'+labelClass+'"><b>'+head+'</b></label> <div class="'+inputClass+'">'+ ($this.cleanValue(val) || 0) +'</div></li>');
                break;
                case "control_datetime":
                    if(items)
                    {
                        var isEmpty = !(items.day || items.hour || items.min || items.month || items.year);
                        if (isEmpty)
                        { 
                            if (hideEmpty) 
                            {
                                return; /* continue; */ 
                            }
                            items = {day:1,hour:0,min:0,month:1,year:1900}; 
                        }
                        var d = items;
                        var date;
                        var convertFormat = "dddd, MMMM dd, yyyy";
                        var time = "";
                        
                        if (!d.day || !d.month || !d.year) {
                            ul.insert('<li class="'+lineClass+'"><label '+labelWidth+'class="'+labelClass+'"><b>'+head+'</b></label> <div class="'+inputClass+'">'+value+'</div></li>');
                            break;
                        }

                        // if month or day are single digits, prepend '0' to convert them to dates properly.
                        if ( d.month.length == 1 ) {
                            d.month = '0' + d.month;
                        }
                        if ( d.day.length == 1 ) {
                            d.day = '0' + d.day;
                        }
                        
                        // If date object is other than usual
                        if(!('year' in d && 'month' in d))
                        {
                            d = {};
                        }

                        if("ampm" in d){
                            if(d.hour)
                                time = d.hour+":"+d.min+" "+d.ampm;
                        }else if("hour" in d){
                            if(d.hour)
                                time = d.hour+":"+d.min;
                        }
                        format = "yyyy-MM-dd";
                        convertFormat = "dddd, MMMM dd, yyyy";
                        value = date = d.year+"-"+d.month+"-"+d.day;
                        var parsed = Date.parseExact(date, format)? Date.parseExact(date, format).toString(convertFormat) : "";
                        if(!parsed && value !== ""){
                            parsed = value;
                        } else {
                            parsed += ' ' + time;
                        }

                        var date_answer = '<img src="images/calendar.png" align="top" /> '+parsed;
                        
                        if(!parsed || isEmpty){
                            date_answer = "-";
                        }
                    } else {
                        var date_answer = "-";
                    }

                    ul.insert('<li class="'+lineClass+'"><label '+labelWidth+'class="'+labelClass+'"><b>'+head+'</b></label> <div class="'+inputClass+'">'+date_answer+'</div></li>');
                break;
                case "control_time":
                    if(items && (items.hourSelect && items.hourSelect != "" || items.minuteSelect && items.minuteSelect != "")) {
                        value = items.hourSelect + ":" + items.minuteSelect;
                        value += items.ampm && items.ampm != "" ? " " + items.ampm : "";
                        if((items.hourSelectRange && items.hourSelectRange != "") || (items.minuteSelectRange && items.minuteSelectRange != "")) {
                            value += " - " + items.hourSelectRange + ":" + items.minuteSelectRange;
                            value += items.ampmRange && items.ampmRange != "" ? " " + items.ampmRange : "";
                        }
                    } else if (hideEmpty) {
                        return;
                    }
                    ul.insert('<li class="'+lineClass+'"><label '+labelWidth+'class="'+labelClass+'"><b>'+head+'</b></label> <div class="'+inputClass+'">'+($this.cleanValue(value.escapeHTML()) || 0)+'</div></li>');
                break;
                case "control_phone":
                    if(!items){ 
                        if (hideEmpty) {
                            return; /* continue; */ 
                        }
                        items = {}; 
                    }
                    var p = items;
                    if(!p.phone){
                        //add a condition to check wether the phone number field is using a phone masking/full or not
                        var _li_html = '<li class="'+lineClass+'"><label '+labelWidth+'class="'+labelClass+'"><b>'+head+'</b></label> <div class="'+inputClass+'">';
                        _li_html += ( p.full ) ? '<img src="images/telephone.png" align="top" /> ' + p.full : '-';
                        _li_html += '</div></li>';

                        //insert it to the ul tag element
                        ul.insert( _li_html );
                    }else{
                        var country = (p.country)?' (' + p.country + ')':'';
                        var area = (p.area) ? ' (' + p.area.stripTags().stripEvents() + ') ' : '';
                        ul.insert('<li class="'+lineClass+'"><label '+labelWidth+'class="'+labelClass+'"><b>'+head+'</b></label> <div class="'+inputClass+'"><img src="images/telephone.png" align="top" />' + country + area + p.phone.stripTags().stripEvents() +'</div></li>');
                    }
                break;
                case "control_signature":
                    ul.insert('<li class="'+lineClass+' inline-img"><label '+labelWidth+'class="'+labelClass+'"><b>'+head+'</b></label> <div class="'+inputClass+'">'+ value + '</div></li>');
                    break;
                case "control_rating":
                    ul.insert('<li class="'+lineClass+'"><label '+labelWidth+'class="'+labelClass+'"><b>'+head+'</b></label>'+
                    '<div class="'+inputClass+'"><div id="star_rating-'+qprop.qid+'" disabled="true" stars="'+(qprop.stars)+'" value="'+value+'" data-lowest="'+qprop.scaleFrom+'"></div></div></li>');
                    var stars = 'images/stars.png';
                    switch(qprop.starStyle){
                        case "Hearts": stars = "hearts"; break;
                        case "Stars": stars = "stars"; break;
                        case "Stars 2": stars = "stars2"; break;
                        case "Lightnings": stars = "lightnings"; break;
                        case "Light Bulps": stars = "bulps"; break;
                        case "Shields": stars = "shields"; break;
                        case "Flags": stars = "flags"; break;
                        case "Pluses": stars = "pluses"; break;
                        default: stars = "stars";
                    }
                    $('star_rating-'+qprop.qid).rating({imagePath:"images/"+stars+".png"});
                break;
                case "control_scale":
                    ul.insert('<li class="'+lineClass+'"><label '+labelWidth+'class="'+labelClass+'"><b>'+head+'</b></label> <div class="'+inputClass+'">'+($this.cleanValue(value) || 0)+'/'+qprop.scaleAmount+'</div></li>');
                break;
                case "control_emojislider":
                    // get emoji image id which corresponds to the answer value
                    var emojiScale = {
                        '3': { '1': '1', '2': '4', '3': '7' },
                        '5': { '1': '1', '2': '2', '3': '4', '4': '6', '5': '7' }
                    };
                    var emojiId = (emojiScale[qprop.emojiCount] && emojiScale[qprop.emojiCount][value]) ? emojiScale[qprop.emojiCount][value] : value;
                    html = '<img src="' + Utils.HTTP_URL +'images/seven_scale_icons/' + emojiId + '.png" height="18" width="18" alt="X" align="top" />';
                    ul.insert('<li class="'+lineClass+'"><label '+labelWidth+'class="'+labelClass+'"><b>'+head+'</b></label> <div class="'+inputClass+'">'+ html +'</div></li>');
                break;
                case "control_slider":
                    ul.insert('<li class="'+lineClass+'"><label '+labelWidth+'class="'+labelClass+'"><b>'+head+'</b></label> <div class="'+inputClass+'">'+($this.cleanValue(value) || 0)+'/'+qprop.maxValue+'</div></li>');
                break;
                case "control_range":
                    if(!items){ 
                        if (hideEmpty) {
                            return; /* continue; */ 
                        }
                        items = {}; 
                    }
                    var range  = "From:".locale() + " " + ($this.cleanValue(items.from) || 0)+"<br>";
                        range += "To:".locale() + " " + ($this.cleanValue(items.to) || 0)+"<br>";
                        range += "Difference: "+($this.cleanValue(items.to)-$this.cleanValue(items.from))+"<br>";
                    
                    ul.insert('<li class="'+lineClass+'"><label '+labelWidth+'class="'+labelClass+'"><b>'+head+'</b></label> <div class="'+inputClass+'">'+range+'</div></li>');
                break;
                case "control_grading":
                    var grading = "";
                    var opts = qprop.options.split("|");
                    var total = 0;
                    if(!items){ 
                        if (hideEmpty) {
                            return; /* continue; */ 
                        }
                        items = []; 
                    }
                    for(var x=0; x<opts.length; x++){
                        total += parseInt($this.cleanValue(items[x])||0);
                        grading += opts[x] +": "+ ($this.cleanValue(items[x]) || 0) +"<br>";
                    }
                    if(items == []){
                        grading += "Total: 0";
                    }else{
                        grading += "Total: " + total + "/" + qprop.total;
                    }
                    ul.insert('<li class="'+lineClass+'"><label '+labelWidth+'class="'+labelClass+'"><b>'+head+'</b></label> <div class="'+inputClass+'">'+grading+'</div></li>');
                break;
                case "control_matrix":
                    var empty = true;
                    if (!items) {
                        empty = true;
                    } else {
                        if (typeof items == 'object') {
                            empty = false;
                        } else {
                            for (var i = 0; i < items.length; i++) {
                                if (items[i] && typeof items[i] !== 'string') { 
                                    for (var j = 0; j < items[i].length; j++) {
                                        if (items[i][j]) {
                                            empty = false;
                                        }
                                    }   
                                } else if (items[i] != '') {
                                    empty = false;
                                }
                            }
                        }
                    }
                    if (empty) {
                        if (hideEmpty) {
                            return; /* continue; */
                        }
                        items = {}; 
                    }
                    // manipulate data table html for submission details part
                    var tempElement = document.createElement('div');
                    tempElement.innerHTML = value;
                    var $table = tempElement.firstElementChild;
                    $table.removeAttribute('border');
                    $table.removeAttribute('style');
                    $table.addClassName('form-matrix-table');
                    var ths = $table.getElementsByTagName('th');
                    var tds = $table.getElementsByTagName('td');
                    var i;
                    
                    for (i = 1; i < ths.length; i++) {
                        ths[i].removeAttribute('style');
                        ths[i].addClassName('form-matrix-column-headers');
                    }
                    for (i = 0; i < tds.length; i++) {
                        tds[i].removeAttribute('style');
                        tds[i].addClassName('form-matrix-values');
                    }
                    
                    html = $table.outerHTML;
                    ul.insert('<li class="' + lineClass + '"><label ' + labelWidth + 'class="' + labelClass + '"><b>' + head + '</b></label> <div class="' + inputClass + '">' + html + '</div></li>');
                break;
                case "control_screenshot":
                    if(!items.data){
                        items.data = "/images/photo.png";
                    }
                    
                    if(!items.message){
                        items.message = '<span style="color:#999">No comment</span>';
                    }
                    
                    ul.insert('<li class="'+lineClass+'"><label '+labelWidth+'class="'+labelClass+'"><b>'+head+'</b></label> <div class="'+inputClass+'">'+
                    
                              '<div style="max-width:200px; display:inline-block; overflow:hidden;border:1px solid #ccc;">'+
                              
                              '<a href="'+items.data+'" target="_self"><img border="0" width="100%" src="'+items.data+'" /></a></div><br><br>'+
                              '<b>User\'s Comment:</b><br>'+
                                $this.cleanValue(items.message)+
                              '</div></li>');
                break;
                case "control_fileupload":
                case "control_newfileupload":
                    var values = value.split(/<br\s\/\>/gim);
                    var htmlContent = '';
                    $A(values).each(function(value){
                        var link = value.match(/href=\"(.*?)\"/);
                        if (!link) {
                            link = "";
                        } else { link = link[1]; }
                        var ext = Utils.getFileExtension(link);
                        if(Utils.imageFiles.include(ext.toLowerCase())){
                            htmlContent += '<div style="max-width:200px; display:inline-block; overflow:hidden;border:1px solid #ccc;"><img width="100%" src="'+link+'" /></div><br>'+value;
                        }else{
                            if(value === ""){ value = "-"; }
                            htmlContent += value;
                        }
                        
                        htmlContent += '<br><br>';
                    });

                    var li = '<li class="'+lineClass+' fileupload-img inline-img"><label '+labelWidth+'class="'+labelClass+'"><b>'+head+'</b></label> <div class="'+inputClass+'">' + htmlContent + '</div></li>';

                    ul.insert(li);
                    break;
                case "control_appointment":
                    var splittedValue = value.split(" ");
                    var timezone = qprop.timeFormat === 'AM/PM' ? (splittedValue[7] || '') : (splittedValue[5] || '');
                    var timezoneText = timezone ? ' - '+ timezone+' Time' : '';
                    var date = value.replace(timezone, '');
                
                    ul.insert('<li class="'+lineClass+'"><label '+labelWidth+'class="'+labelClass+'"><b>'+head+'</b></label> <div class="'+inputClass+'">'+ $this.cleanValue(date) +'<span style="color: #8894ac">' + timezoneText + '</span></div></li>');                    break;
                case "control_address":
                    if(!items){
                        if (hideEmpty) {
                            return; /* continue; */ 
                        }
                        items = {}; 
                    }
                    
                    if(value === ""){ value = "-"; }
                    $this.columnCount += 5;

                    var prettyAddress  = '';
                    if( typeof items['addr_line1'] !== 'undefined') prettyAddress += qprop.sublabels['addr_line1'] + " : " + items['addr_line1'].stripTags().stripEvents() + "\n";
                    if( typeof items['addr_line2'] !== 'undefined') prettyAddress += qprop.sublabels['addr_line2'] + " : " + items['addr_line2'].stripTags().stripEvents() + "\n";
                    if( typeof items['city'] !== 'undefined') prettyAddress += qprop.sublabels['city'] + " : " + items['city'].stripTags().stripEvents() + "\n";
                    if( typeof items['state'] !== 'undefined') prettyAddress += qprop.sublabels['state'] + " : " + items['state'].stripTags().stripEvents() + "\n";
                    if( typeof items['postal'] !== 'undefined') prettyAddress += qprop.sublabels['postal'] + " : " + items['postal'].stripTags().stripEvents() + "\n";
                    if( typeof items['country'] !== 'undefined') prettyAddress += qprop.sublabels['country'] + " : " + items['country'].stripTags().stripEvents() + "\n";

                    // Address fields not sorted 
                    // for (label in qprop.sublabels) {
                    //     if (items[label]) {
                    //         prettyAddress += qprop.sublabels[label] + " : " + items[label].stripTags() + "\n";
                    //     }
                    // }

                    ul.insert('<li class="'+lineClass+'"><label '+labelWidth+'class="'+labelClass+'"><b>'+head+'</b></label> <div class="'+inputClass+'">'+$this.cleanValue(prettyAddress)+'<div id="mapContainer'+key+'" style="display:none;min-height:270px;"><div id="mapCanvas'+key+'" style="width:300px;height:250px;margin-top:10px;border:1px solid #000"></div></div></div></li>');
                    
                    if (/*"https:" != document.location.protocol &&*/ showMaps === true) {
                        GoogleMap.setMap(key, $this.cleanValue($H(items).values().join(" ")));
                    }
                    break;
                case "control_helper":
                    if(value === ""){ value = "-"; }
                    var fbul = $('fb-items');
                    
                    if(!fbul){
                        ul.insert('<li><ul id="fb-items"></ul></li>');
                        fbul = $('fb-items');
                    }
                    
                    switch(qprop.data){
                        case "pic_with_logo_public":
                            fbul.insert({top:'<img src="'+value+'" style="position:absolute; right:20px; top:20px; border:2px solid #B8AFDE" />'});
                        break;
                        case "user_website":
                            val = value;
                            value = "";
                            $A(val.split(", ")).each(function(url){
                                value += '<a href="'+url+'">'+url+'</a><br>';
                            });
                            
                            fbul.insert('<li class="fb-values '+lineClass+'"><label '+labelWidth+'class="'+labelClass+'"><b>'+head+'</b></label> <div class="'+inputClass+'">'+value+'</div></li>');
                        break;
                        default:
                            fbul.insert('<li class="fb-values '+lineClass+'"><label '+labelWidth+'class="'+labelClass+'"><b>'+head+'</b></label> <div class="'+inputClass+'">'+$this.cleanValue(value)+'</div></li>');
                    }
                break;
                case "control_textbox":
                case "control_textarea":
                        // http://stackoverflow.com/questions/20419989/
                        function linkify(html) {
                            //link regex
                            reg  = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&amp;&@#\/%?=~_|!:,.;]*[-A-Z0-9+&amp;&@#\/%=~_|])/ig
                            //just to make the txt parse easily, without (start) or (ends) issue
                            html = '>' + html + '<';
                            //parse txt between > and < but not follow with</a
                            html = html.replace(/>([^<>]+)(?!<\/a)</g, function(match, txt) {
                                txt = txt.replace(reg, function(m, t) {
                                    if(t.indexOf("http") == -1)
                                        url = "http://" + t;
                                    else
                                        url = t;
                                    return "<a href='" + url + "' target='blank'>" + t + "</a>";
                                });
                                //now replace the txt
                                return '>' + txt + '<';
                            });
                            //remove the head > and tail <
                            return html.substring(1, html.length - 1);
                        }

                        ul.insert('<li class="'+lineClass+'"><label '+labelWidth+'class="'+labelClass+'"><b>'+head+'</b></label> <div class="'+inputClass+'">'+ linkify($this.cleanValue(value)) +'</div></li>');
                break;
                case "control_filepickerIO":
                    // Neil: filepicker saved value is link html, but it should open in a new window so we will add target="_self";
                    value = value.replace(/\<a/g, '<a target="_self"'); 
                    ul.insert('<li class="'+lineClass+'"><label '+labelWidth+'class="'+labelClass+'"><b>'+head+'</b></label> <div class="'+inputClass+'">'+$this.cleanValue(value)+'</div></li>');
                break;

                case "control_widget":
                    var hasImage = false;
                    var hasLink = false;
                    if (['field', 'direct_embed'].indexOf(qprop.widgetType) >= 0) {
                        hasImage = value.indexOf('src=') > 0;
                        hasLink = value.indexOf('href=') > 0;
                        if (hasImage) {
                            lineClass = lineClass + ' inline-img';
                        }

                        if (hasLink) {
                            lineClass = lineClass + ' fileupload-img';
                        }

                        // for value that has base64image on it
                        if (!!~value.indexOf('data:image')) {
                            value = "<img src='" + value + "' alt='" + head + "' style='max-width:100%; max-height:100%;'/>";
                        }
                    }

                    ul.insert('<li class="'+lineClass+'"><label '+labelWidth+'class="'+labelClass+'"><b>'+head+'</b></label> <div class="'+inputClass+'">'+ value + '</div></li>');
                    break
                case "control_fullname":
                    var prettyName = "";
                    for (x in items) {
                        if (typeof items[x] == "string") {
                            prettyName += " "+ items[x].stripTags().stripEvents();
                        }
                    }

                    $this.columnCount += 2;
                    
                    ul.insert('<li class="'+lineClass+'"><label '+labelWidth+'class="'+labelClass+'"><b>'+head+'</b></label> <div class="'+inputClass+'">'+ $this.cleanValue(prettyName.trim()) +'</div></li>');
                    break;
                break;
                default:
                    if(value === ""){ value = "-"; }
                    //Emre: 39069
                    if(head == "Submission Date"){
                    	ul.insert('<li class="'+lineClass+'"><label '+labelWidth+'class="'+labelClass+'"><b>'+head.locale()+'</b></label> <div class="'+inputClass+'">'+$this.cleanValue(value)+'</div></li>');
                    }else{
                        //if this is image base64 url
                        if($this.cleanValue(value).match("data:image/") !== null) {
                            ul.insert('<li class="'+lineClass+'"><label '+labelWidth+'class="'+labelClass+'"><b>'+head+'</b></label> <div class="'+inputClass+'"><img src="'+$this.cleanValue(value)+'"/></div></li>');
                        } else {
                        	ul.insert('<li class="'+lineClass+'"><label '+labelWidth+'class="'+labelClass+'"><b>'+head+'</b></label> <div class="'+inputClass+'">'+$this.cleanValue(value)+'</div></li>');
                        }
                    }
            }
        };
        $this.columnCount = 0;
        // $A($this.data.columns).each(function(column){
        $A(['id', 'created_at', 'ip']).each(processField);
        $H($this.properties).each(processField);

        if(emails.length > 0){
            var email = emails.join(",");
            $('replyButton').enable().onclick = function(){
                $this.sendEmail(email, $this.convertToEmail(sc.innerHTML), 'reply');

                Submissions.sendWatchmanEvent('emailReply');
            };
        }else{
            $('replyButton').disable();
        }

        $('forwardButton').onclick = function(){
            $this.sendEmail(email, $this.convertToEmail(sc.innerHTML), 'forward');

            Submissions.sendWatchmanEvent('emailForward');
        };

        if (JSON.stringify(chargeLaterData).length > 0) {
            $this.chargeLaterHandler(chargeLaterData);
        }

        if ($('openPdfOptions')) {

            var getPdf = function(mode) {
                if ($this.properties.form.isEncrypted !== 'Yes') {
                    if((document.publicListing === "undefined" || document.publicListing === "false") && $this.isNewPDFUser()) {
                        Utils.Request({
                            parameters: {
                                submissionid: $this.getSubmissionID(),
                                formid: $this.formID,
                                username: window.Utils.user.username
                            },
                            server: '/API/generatePDF',
                            method: 'get',
                            onSuccess: function(res){
                                window.open(res.content);
                            }
                        });
                        return;
                    }

                    Utils.redirect(Utils.HTTP_URL + 'server.php', {
                        download:true,
                        method:'post',
                        onLoad: function() {
                        },
                        parameters: {
                          action: mode,
                          sid: $this.getSubmissionID(),
                          formID: $this.formID
                        }
                    });
                } else {
                  Utils.alert("PDF is not available for encrypted forms.".locale());
                }
            }

            var closePdfOptions = function(ev) {                
                if(!ev.target.up("#openPdfOptions") && ev.target !== $('openPdfOptions')) {
                    $$('.page').first().stopObserving('click', closePdfOptions);
                    $("pdfOptions").hide();
                }
            }

            $('openPdfOptions').observe('click', function() {

                Submissions.sendWatchmanEvent('pdfOptionsMenuOpened');
                if($this.editMode) {  //dont show options if in edit mode just get pdf
                    getPdf('getSubmissionPDFPrintable');
                } else {
                    $("pdfOptions").show();
                    $$('.page').first().observe('click', closePdfOptions);
                }
            });

            $('downloadPdf').onclick = function() {
                var hasAccess = this.getAttribute("data-has-access");
                Submissions.sendWatchmanEvent('pdfOptionsDownloadPDF');

                if(hasAccess === "1" && $this.isNewPDFUser()) {
                    window.open(window.location.origin + '/pdf-editor/' + $this.formID + '?preview=true&submission=' + $this.getSubmissionID());
                    return;
                }

                getPdf('getSubmissionPDF');
            };

            // customize pdf button does not exist if user cannot edit
            // also it does not exist in some other cases
            // check https://www.jotform.com/answers/1649500
            if ($('customizePdf')) {
                $('customizePdf').onclick = function() {
                    Submissions.sendWatchmanEvent('pdfOptionsCustomizePDF');
                };
            }
        }
    },
    /**
     * Checks if given user or form uses new PDF
     */
    isNewPDFUser: function() {
        if (typeof window.JOTFORM_ENV !== "undefined" && window.JOTFORM_ENV == 'ENTERPRISE') {
            return false;
        }
        var formPreference = this.properties.form && this.properties.form.usesNewPDF;
        if(formPreference === 'Yes') {
            return true;
        }

        var userPreference = window.Utils && window.Utils.user && window.Utils.user.pdf_designer_group;
        var allowedUserGroups = ['1', '2', '3', '10'];
        if(!formPreference && (!userPreference || allowedUserGroups.indexOf(userPreference) > -1)) {
            return true;
        }

        return false;
    },
    /**
     * Opens a wizard for sending emails
     * @param {Object} email
     * @param {Object} submission
     * @param {Object} type
     */
    sendEmail: function (email, submission, type){
        var $this = this;
        var sline = [];
        $A(submission.split("<br>")).each(function(line){
            if(!line.strip()){ return; /* continue; */}
            sline.push(""+line);
        }); 
        
        var forward;
        
        if(type == "forward"){
            forward = "<br>"+sline.join("<br>");
        }else{
            forward = "<br><br><br><br><br>On "+$this.getSelected().data.created_at+", &lt;"+email+"&gt; submitted:<br><br><div style='color:#1c4dae; margin-left:10px; border-left:2px solid #1c4dae;padding-left:10px;'>"+sline.join("<br>")+"</div>";
        }
        
        var div = new Element('div'), toField, fromField, messageField, textDiv;
        div.insert(new Element('label').insert('<b>' + '[email_from]'.locale() + '</b>').setStyle('float:left; width:100px;'));
        div.insert(fromField = new Element('input', {type:'text'}).setStyle('width:500px'));
        div.insert('<br><br>');
        div.insert(new Element('label').insert('<b>' + '[email_to]'.locale() + '</b>').setStyle('float:left; width:100px;'));
        div.insert(toField = new Element('input', {type:'text'}).setStyle('width:500px'));
        div.insert('<br><br>');
        div.insert(new Element('label').insert('<b>' + '[email_subject]'.locale() + '</b>').setStyle('float:left; width:100px;'));    
        div.insert(subjectField = new Element('input', {type:'text'}).setStyle('width:500px'));
        div.insert('<br><br>');

        //div.insert(new Element('label').insert('<b>' + '[email_body]' + '</b>'));
        //div.insert('<br>');
        div.insert(textDiv = new Element('div').setStyle('background:#fff'));
        textDiv.insert(messageField = new Element('textarea', {id: "email-body"}).setStyle('width:600px;height:300px;'));

        if (!Utils.user.isReviewed || Utils.user.accountType == 'GUEST' || Utils.user.accountType == 'FREE') {
            var captcha = document.createElement('script');
            captcha.src = 'https://www.google.com/recaptcha/api.js';
            div.insert(captcha);

            var captchaDiv = this.createCaptcha();
             div.insert(captchaDiv);
        }
        
        toField.value = type == "forward"? "" : email;
        fromField.value = Utils.user.email || "Enter Your Email Address".locale();
        subjectField.value = type == "forward"? "Fwd: Submission".locale() : "Re: Your Submission".locale();
        
        messageField.value = forward;

        var emailWizard = document.window({
            title:type == "forward"? "Forward Submission".locale() : "Reply Submission".locale(),
            content: div,
            modal:true,
            width:'640',
            dimZindex: 10012,
            winZindex: 10013,
            contentPadding:'15',
            buttons:[{
                title:type == "forward"? 'Forward Submission'.locale() : 'Send Reply'.locale(),
                name:'send',
                handler:function(w){
                    $(fromField, toField).invoke("removeClassName", "error");
                    if (!Utils.checkEmailFormat(fromField.value)) {
                        fromField.addClassName('error');
                        return;
                    }
                    if (!Utils.checkEmailFormat(toField.value)) {
                        toField.addClassName('error');
                        return;
                    }

                    var params = {
                        action: "sendEmail",
                        formID: $this.data.formID,
                        submissionID: $this.getSubmissionID(),
                        from: fromField.value,
                        to: toField.value,
                        subject: subjectField.value,
                        body: Editor.getContent(messageField.id),
                        type: 'submissions-'+type
                    };

                    if (!!captcha) {
                        params['response'] = document.querySelector('.g-recaptcha-response').value;
                    };

                    Utils.Request({
                       parameters: params,
                       onSuccess: function(res){
                           w.close();
                           Utils.alert("Email sent successfully.".locale());
                       },
                       onFail: function(res){
                           Utils.alert(res.error, "Error");
                       }
                    });
                }
            }],
            onInsert: function(w){
                Locale.changeHTMLStrings();
                Editor.load(function() {
                    Editor.set(messageField.id)
                });
            }
        });
    },
    currentSelection: 0,

    createCaptcha: function() {
        var captchaDiv = new Element('div');
        captchaDiv = '<div class="g-recaptcha" id="recaptchaV2" data-sitekey="6LdU3CgUAAAAAB0nnFM3M3T0sy707slYYU51RroJ"></div>';
        captchaDiv += '<script type="text/javascript">';
        captchaDiv +=   'var rc_script_tag = document.createElement("script"),';
        captchaDiv +=                'rc_init_func = function(){';
        captchaDiv +=                  'grecaptcha.render("recaptchaV2", {';
        captchaDiv +=                    '"sitekey" : "6LdU3CgUAAAAAB0nnFM3M3T0sy707slYYU51RroJ",';
        captchaDiv +=                  '});';
        captchaDiv +=                '}\n';

        captchaDiv +=                'rc_script_tag.type = "text/javascript";';
        captchaDiv +=                'rc_script_tag.async = true;';
        captchaDiv +=                'rc_script_tag.defer = true;';
                        // rc_script_tag.onload = function(){ rc_init_func.call(); };
        captchaDiv +=                'rc_script_tag.onreadystatechange = function(){';
        captchaDiv +=                   'if (rc_script_tag.readyState == "loaded" || rc_script_tag.readyState == "complete") {';
        captchaDiv +=                       'rc_init_func.call();';
        captchaDiv +=                   '}';
        captchaDiv +=                '};';
        captchaDiv +=                '(document.getElementsByTagName("head")[0] || document.getElementsByTagName("body")[0]).appendChild(rc_script_tag);';
        captchaDiv += '</script>';

        return captchaDiv;
    },
    /**
     * Gets the currently selected row from the grid
     */
    getSelected: function(){
        return this.grid.getSelectionModel().getSelected() || false;
    },
    
    /**
     * Formats given date in mysql format
     * @param {Object} date
     */
    mySQLFormat: function(date){
        if(!date){
            return null;
        }
        return date.toString('yyyy-MM-dd HH:mm:ss');
    },
    
    startDate: '',
    endDate: '',
    
    /**
     * Sets grid into selected range
     * @param {Object} start
     * @param {Object} end
     */
    setDateRange: function(start, end){
        var startDate, endDate;
        endDate = Date.today()._add(1).days();
        var type = start;
        
        switch(start){
            case "today":
                startDate = Date.today();
            break;
            case "week":
                if(Date.today().getDayName() == "Monday"){
                    startDate = Date.today();
                }else{
                    startDate = Date.today().last().monday();
                }
            break;
            case "month":
                startDate = Date.today().moveToFirstDayOfMonth();
            break;
            case "lastmonth":
                startDate = Date.parse('-1 month').moveToFirstDayOfMonth();
                endDate = Date.parse('-1 month').moveToLastDayOfMonth();
            break;
            case "year":
                startDate = new Date((new Date(new Date(Date.today().setMonth(0))).setDate(1)));
            break;
            case "all":
                startDate = null;
                endDate = null;
            break;
            default:
                type = "custom";
                // startDate = Date.parse(start);
                startDate = start;
                // endDate   = Date.parse(end);
                endDate = end;
        }
        
        if(type !== 'all'){
            var query = "";
            query = "Only This "+type.capitalize();
            query = query.locale();
            if(type == 'lastmonth'){
                query = 'Only the Last Month'.locale();
            }
            if(type == 'today'){
                query = 'Only Today'.locale();
            }
            if(type == 'custom'){
                query = 'Dates between {start} and {end}'.locale({start:start, end:end});
            }
            if($('notification')){
                $('notification').update('<img src="images/information.png" align="top" /> '+'Displaying submissions:'.locale()+' <b>'+ query+'</b>').show();
            }
        }else{
            if($('notification')){
                $('notification').update().hide();
            }
        }

        this.saveDateRange(type);
        var store = this.grid.getStore();

        this.startDate = this.mySQLFormat(startDate);
        this.endDate = this.mySQLFormat(endDate);
        //Set store base parameters -- required for dateranged grid paging
        store.setBaseParam('startDate', this.startDate);
        store.setBaseParam('endDate', this.endDate);

        //Prevent submissions from loading twice on page load
        if(this.initComplete) {
            store.load({
                params: {start: 0, startDate: this.startDate, endDate: this.endDate},
                callback: function () {
                    this.firstRow = true;
                }.bind(this)
            });
        }

        this.saveColumnSettings();
    },
    /**
     * First Checks all duplicate options if found removes all and re-places first found instance
     * Basically cleans up the configuration array.
     * This is needed because of a previous bug. we have mistakenly places the same configuration in the array many times
     * So this array needs to be cleaned up for all users. Patch applied  06 / Dec / 2010
     */
    checkDuplicates: function(){
        var $this = this;
        this.excludeColumns = $A(this.excludeColumns).uniq();
        var found = 0;
        var firstOption = "";
        $A(this.excludeColumns).each(function(v, i){
            if(v.include && v.include('rangeType:')){
                if(firstOption === ""){
                    firstOption = v;
                }
                found++;
            }
        });
        
        if(found > 1){
            $A(this.excludeColumns).each(function(v, i){
                if(v.include && v.include('rangeType:')){
                    delete $this.excludeColumns[i];
                }
            });
            this.excludeColumns.push(firstOption);
            this.excludeColumns = $A(this.excludeColumns).compact();
        }

    },
    
    
    /**
     * Saves the selected range type into DB
     * @param {Object} type
     */
    saveDateRange: function(type){
        
        this.checkDuplicates();
        
        var savedindex = false;
        $A(this.excludeColumns).each(function(v, i){
            if(v.include && v.include('rangeType:')){
                savedindex = i;
                throw $break;
            }
        });
        
        var data = "rangeType:"+type;
        if(savedindex !== false){
            this.excludeColumns[savedindex] = data;
        }else{
            this.excludeColumns.push(data);
        }
    },
    
    /**
     * Gets last the saved range type
     */
    getDateRange: function(){
        var type = "all";
        $A(this.excludeColumns).each(function(v, i){
            
            if(v.include && v.include('rangeType:')){
                type = v.split(":")[1];
                throw $break;
            }
        });
        
        return type;
    },
    
    /**
     * Saves the custom date range in columns settings
     * @param {Object} start
     * @param {Object} end
     */
    saveCustomDate: function(start, end){
        var savedindex = false;
        $A(this.excludeColumns).each(function(v, i){
            if(v.include && v.include('custom:')){
                savedindex = i;
                throw $break;
            }
        });
        
        if(!start || !end){
            if (savedindex !== false) {
                delete this.excludeColumns[savedindex];
                this.excludeColumns = $A(this.excludeColumns).compact();
            }
            return;
        }
        
        var data = "custom:"+start+","+end;
        if(savedindex !== false){
            this.excludeColumns[savedindex] = data;
        }else{
            this.excludeColumns.push(data);
        }
    },
    
    /**
     * Gets the selected custom date from columns settings
     */
    getCustomDate: function(){
        var range = false;
        $A(this.excludeColumns).each(function(v, i){
            if(v.include && v.include('custom:')){
                range = v;
                throw $break;
            }
        });
        
        if(range){
            var rawdates = range.split(":")[1];
            var dates = rawdates.split(",");
            
            return {"start": dates[0], "end":dates[1]};
        }
        return false;
    },
    
    
    /**
     * Creates the date range fields
     */
    createRangePicker: function(start, end){
        // Date picker              
        var fromdate = new Ext.form.DateField({
            format: 'Y-m-d', //YYYY-mm-DD
            fieldLabel: '',
            id: 'startdt',
            name: 'startdt',
            width:140,
            allowBlank:false,
            vtype: 'daterange',
            endDateField: 'enddt'// id of the 'To' date field
        });
 
        var todate = new Ext.form.DateField({
            format: 'Y-m-d', //YYYY-mm-DD
            fieldLabel: '',
            id: 'enddt',
            name: 'enddt',
            width:140,
            allowBlank:false,
            vtype: 'daterange',
            startDateField: 'startdt'// id of the 'From' date field
        });
        
        
        fromdate.render('fromdate');
        todate.render('todate');
        
        fromdate.setRawValue(start || "");
        todate.setRawValue(end || "");
    },

    /**
     * Register any Grid Settings before calling everything
     * @param response - object array of the grid settings
     */
    startUpGridSettings: function(response)
    {
        this.gridSettings = {
            gridAutoFit: (response.success && typeof response.gridAutoFit !== "undefined" && response.gridAutoFit.checked=="yes") ? true : false,
            gridCellMaxH: (response.success && typeof response.gridCellMaxH !== "undefined" ) ? response.gridCellMaxH.value : false,
            displayImgRaw: (response.success && typeof response.displayImgRaw !== "undefined" && response.displayImgRaw.checked=="yes") ? true : false,
            useModalForImgs: (response.success && typeof response.useModalImg !== "undefined" && response.useModalImg.checked=="yes") ? true : false
        };
    },
    
    changeForm: function() {
        var title = $$('.title-cont').first();
        var closeFormsList = function(ev) {
            if(!ev.target.up(".title-cont")) {
                $$('.page').first().stopObserving('click', closeFormsList);
                $('submissions-forms-list').hide();
            }
        }

        if (typeof title != 'undefined') {
            title.observe('click', function() {
                $('submissions-forms-list').show();        
                $$('.page').first().observe('click', closeFormsList);

                Submissions.sendWatchmanEvent('formTitleClick');
            });
        };
    },

    /**
     * Initiates the grid on load
     * @param {Object} response
     */
    initGrid: function (response){
        this.changeForm();

        if(typeof window.userCanEdit !== 'undefined') {
          this.userCanEdit = window.userCanEdit;
        }

        try{
        var $this = this;
        $this.data = response;
        var form = $this.data.formID;
        var itemname = "Submissions".locale();
        var standAlone = !$('submissions-grid');
        var rpp = this.formID == '53636156391156' ? 5 : 14; //Paul - Temp reduce grid rows for large encrypted form.
        this.initComplete = false;
        
        if($('settings')){
            $('settings').setUnselectable();
            $('settings').observe('click', function(e){
                if(e.target.id == "settings"){
                    $this.toggleSettings();                    
                }
            });
        }

        if (standAlone) {
            // do not hide ip on standalone grid reports (b#236676)
            this.excludeColumns = this.excludeColumns.without("id","ip");
        }
        
        if(standAlone){
            rpp = Math.floor((document.viewport.getDimensions().height - 22 - 27) / 22);
        }

        var searchBarStyle = {};
        if (Utils.user.isHIPAA === '1') {
            searchBarStyle = { display: 'none' };
        }

        var searchfield = new Ext.form.TextField({
            placeholderText: "Search In Submissions".locale(),
            id:"gridSearch",
            name: "pin",
            style: searchBarStyle,
            width:210,
            listeners:{
                render: function(f){
                    f.el.on('keydown', function(e, el){
                        if ((e.button === 7 && el.value === "") ||Â el.value.length > 2) {
                            f.el.dom.disable();

                            Submissions.sendWatchmanEvent('searchSubmissions', el.value.stripTags());
                            store.load({params: { start: 0, limit: rpp, keyword: el.value.stripTags()}});
                        }
                    }, f, {buffer: 1500});
                },
                afterrender: function() {
                    var el = this.getEl();
                    if (el && this.placeholderText) {
                        el.set({'placeholder': this.placeholderText});
                    }
                }
            }
        });
        
        if(!("listID" in window)) {
            listID = "";
        }

        var store = new Ext.data.Store({
            proxy: new Ext.data.ScriptTagProxy({
                url: Utils.HTTP_URL+'server.php?action=getExtGridSubmissions&formID=' + form + '&listID=' + listID, 
                timeout: 180000,
            }),
            reader: new Ext.data.JsonReader({
                root: 'data',
                totalProperty: 'totalCount',
                id: 'id',
                fields: $this.data.fields
            }),
            remoteSort: true,
            listeners:{
                beforeload: function(store, options){
                    var keyword = searchfield.getValue();
                    $('gridSearch').enable();
                    store.setBaseParam('keyword', keyword);
                },
                load: function(store, options) {
                    setTimeout(function(){
                        if (Submissions.selectedSubmissionIndex) {
                            Submissions.selectedSubmissionIndex = undefined;
                            return;
                        }
                        if($this.keepLastSelection){
                            $this.grid.getSelectionModel().selectRow($this.currentSelection);
                            $this.keepLastSelection = false;
                            return;
                        }
                        var page = $this.bbar.getPageData().activePage;
                        $this.lastPageNum = $this.currentPageNum;
                        $this.currentPageNum = page;
                        if($this.firstRow = true || ($this.currentPageNum > $this.lastPageNum)){
                            $this.grid.getSelectionModel().selectFirstRow();
                        }else{
                            $this.grid.getSelectionModel().selectLastRow();
                        }
                    }, 100);

                    //Generates thumbnails on hover for images inside the Grid after its fully loaded
                    if ( standAlone && $this.gridSettings) {
                        jf_Reports.handleGridLinks($this.gridSettings, '.x-grid-panel');
                        jf_Reports.handleImagesModal($this.gridSettings.useModalForImgs);

                        //set style from report settings
                        if ( $$(".x-grid3-cell-inner").length > 0 )
                        {
                            var maxCellHeight = ( $this.gridSettings && typeof $this.gridSettings.gridCellMaxH !== 'undefined' ) ? $this.gridSettings.gridCellMaxH : "100px";
                            maxCellHeight = ( maxCellHeight.indexOf("px") > -1 ) ? maxCellHeight : (maxCellHeight + 'px');
                            $$(".x-grid3-cell-inner").each(function(node){
                                node.setStyle({'max-height': maxCellHeight});
                            });
                        }
                    }

                    if ($this.hasUpload()) {
                        $this.grid.getTopToolbar().getComponent("uploadsButton").updateHidden();
                    }
                },
                loadexception: function(){

                    Submissions.grid.getStore().removeAll();
                    if($('sub-content')){
                        $('sub-content').update('<table width="100%" height="100%" id="no-result"> <tr> <td align="center"> <h2>'+
                        
                        'No results to display.'.locale() +
                        
                        '</h2> ' +
                        
                        'Check your search query or time frame options.'.locale() +
                        
                        '</td></tr></table>');
                    }

                    if ($this.hasUpload()) {
                        $this.grid.getTopToolbar().getComponent("uploadsButton").updateHidden();
                    }
                }
            }
        });
        
        // This code adds a row numbers to grid however you need to set 
        // new and flag markers again to fix confusion
        // $this.data.columns.unshift(new Ext.grid.RowNumberer());

        if(standAlone && this.data.columns[0]['hidden'] === true) {
            $this.data.columns.shift();
        }
        
        var cm = new Ext.grid.ColumnModel($this.data.columns);
        //If user does not have edit permissions do not create delete column
        if(!standAlone || !this.userCanEdit){
            cm.setRenderer(2, function(value, obj, row){
                if(window.location.href.indexOf("https") == -1){
                    var source = "http://cdn.jotfor.ms/";
                }else{
                    var source = "https://cdn.jotfor.ms/";
                }

                return '<img src="'+source+'images/blank.gif" class="delimg index-cross" id="img-'+row.data.submission_id+'" onclick="Submissions.deleteSubmission(\''+row.data.submission_id+'\', this)" />';
            });

            cm.setRenderer(0, function(value, obj, row){
                if(window.location.href.indexOf("https") == -1){
                    var source = "http://cdn.jotfor.ms/";
                }else{
                    var source = "https://cdn.jotfor.ms/";
                }

                if(value == "0"  || !value){
                    return '<img src="'+source+'images/mail-open.png" id="img-'+row.data.submission_id+'" onclick="Submissions.makeUnread(\''+row.data.submission_id+'\', this)" />';
                }
                return '<img src="'+source+'images/mail.png" id="img-'+row.data.submission_id+'" />';
            });
            
            cm.setRenderer(1, function(value, obj, row){

              var source, onClick = '', flag;

              if(window.location.href.indexOf("https") == -1){
                  source = "http://cdn.jotfor.ms/";
              }else{
                  source = "https://cdn.jotfor.ms/";
              }

              var notFlagged = value == "0" || !value;

              if(this.userCanEdit) {
                if (notFlagged) {
                  onClick = 'onclick="Submissions.flag(\''+row.data.submission_id+'\', this)"';
                } else {
                  onClick = 'onclick="Submissions.unflag(\''+row.data.submission_id+'\', this)"';
                }
              }

              if (notFlagged) {
                flag = source + 'images/flag-disable.png';
              } else {
                flag = source + 'images/flag.png';
              }

              return '<img src="' + flag + '" ' + onClick + ' />';
            }.bind(this));
        }
        
        var tbar = {
            items:['Download as:'.locale()+" ", {
                text:'Excel',
                iconCls: 'excelButton',
                handler: function(button){
                    //get row and column count
                    var length = $this.grid.getStore().totalLength;
                    var columnCount = $this.columnCount;
                    if(length <= 0) {
                        Utils.alert('There is no data to export');
                        return false;
                    }
                    
                    var dlManager = $this.downloadManager.adjustBatch('Excel',columnCount, length);
                    parameters = {
                        action:'getExcel',
                        formID:form,
                        excludeList:$this.excludeColumns.join(','),
                        startDate: $this.startDate || "",
                        endDate: $this.endDate || "",
                        limit: dlManager.batchLimit,
                        orderField: $this.grid.getStore().sortInfo.field,
                        orderDirection: $this.grid.getStore().sortInfo.direction,
                    }
                    //get search text
                    var search = $('gridSearch').value;
                    if(search && search != "Search In Submissions".locale())
                        parameters['keyword'] = search;
                    
                    if (!dlManager.checkLength(length, button,'Excel')) return;
                    parameters['startFrom'] = dlManager.currentDownload['Excel'] || 0;

                    button.setDisabled(true);
                    button.setText('Generating...'.locale());
                    button.setIconClass('loadingButton');

                    Utils.redirect(Utils.HTTP_URL+'server.php', {
                        encode:false,
                        download:true,
                        onLoad: function(){
                            button.setDisabled(false);
                            button.setText('Excel');
                            button.setIconClass('excelButton');

                            dlManager.continueDownload(length, button, 'Excel');
                        },
                        onFail: function(){
                            button.setDisabled(false);
                            button.setText('Excel');
                            button.setIconClass('excelButton');

                            dlManager.continueDownload(length, button, 'Excel', true);
                        },
                        parameters: parameters
                    });

                    Submissions.sendWatchmanEvent('downloadClicked', 'excel');
                }
            },/*{
                text:'Word',
                iconCls: 'wordButton',
                handler: function(){}
            },*/
            {
                text:'CSV',
                iconCls: 'csvButton',
                handler: function(button){
                    //get row and column count
                    var length = $this.grid.getStore().totalLength;
                    var columnCount = $this.columnCount;
                    if(length <= 0) {
                        Utils.alert('There is no data to export');
                        return false;
                    }

                    var dlManager = $this.downloadManager.adjustBatch('CSV',columnCount, length);
                    parameters = {
                        action:'getCSV',
                        formID:form,
                        excludeList:$this.excludeColumns.join(','),
                        startDate: $this.startDate || "",
                        endDate: $this.endDate || "",
                        limit: dlManager.batchLimit,
                        orderField: $this.grid.getStore().sortInfo.field,
                        orderDirection: $this.grid.getStore().sortInfo.direction
                    }
                    //get search text
                    var search = $('gridSearch').value;
                    if(search && search != "Search In Submissions".locale())
                        parameters['keyword'] = search;

                    if (!dlManager.checkLength(length, button,'CSV')) return;
                    parameters['startFrom'] = dlManager.currentDownload['CSV'] || 0;
                    
                    button.setDisabled(true);
                    button.setText('Generating...'.locale());
                    button.setIconClass('loadingButton');
                    
                    Utils.redirect(Utils.HTTP_URL+'server.php', {
                        encode:false,
                        download:true,
                        onLoad: function(){
                            button.setDisabled(false);
                            button.setText('CSV');
                            button.setIconClass('csvButton');
                            dlManager.continueDownload(length, button, 'CSV');
                        },
                        onFail: function(){
                            button.setDisabled(false);
                            button.setText('CSV');
                            button.setIconClass('csvButton');
                            dlManager.continueDownload(length, button, 'CSV', true);
                        },
                        parameters: parameters
                    });


                    Submissions.sendWatchmanEvent('downloadClicked', 'csv');
                }
            }, {
                text: 'PDF',
                iconCls: 'pdfButton',
                handler: function(button) {
                    //Initiate post parameters
                    parameters = {
                        action: 'getPDF',
                        formID:form,
                        formTitle: $this.properties.form.title,
                        orderField: $this.grid.getStore().sortInfo.field,
                        orderDirection: $this.grid.getStore().sortInfo.direction
                    };

                    var totalLength = 0;
                    //Selected rows
                    var selections = new Array();
                    ($A($this.grid.getSelectionModel().getSelections())).each(function (item){selections.push(item.id);});
                    //shortcut download manager
                    var dlManager = $this.downloadManager;
                    dlManager.batchLimit = 10;
                    if ( selections.length > 1)
                    {
                        totalLength = selections.length;
                        if( totalLength > 10) {
                            //limit selections to 20
                            selections = selections.slice(0,10);
                        }
                        //add selections to parameters
                        parameters['selections'] = Object.toJSON(selections);
                        if (!dlManager.checkLength(totalLength, button,'PDF')) return;                  
                    } else {
                        //get search text
                        var search = $('gridSearch').value;
                        if(search && search != "Search In Submissions".locale())
                            parameters['keyword'] = search;
                        //Total count of rows in the grid
                        totalLength = $this.grid.getStore().totalLength;
                        parameters['excludeList'] = $this.excludeColumns.join(',');
                        parameters['startDate'] = $this.startDate || "";
                        parameters['endDate'] = $this.endDate || "";
                        if (!dlManager.checkLength(totalLength, button,'PDF')) return;
                        parameters['startFrom'] = dlManager.currentDownload['PDF'] || 0;
                    }
                    //Disable Download Button
                    button.setDisabled(true);
                    button.setText('Generating...'.locale());
                    button.setIconClass('loadingButton');

                    Utils.redirect(Utils.HTTP_URL+'server.php', {
                        encode:false,
                        download:true,
                        onLoad: function(id){
                            //button.setDisabled(false);
                            //button.setText('PDF');
                            //button.setIconClass('pdfButton');
                            dlManager.trackPDFDownload(button, id);
                            //dlManager.continueDownload(totalLength, button,'PDF');
                        },
                        onFail: function(status){
                            button.setDisabled(false);
                            button.setText('PDF');
                            button.setIconClass('pdfButton');
                            if(status === "409") {
                                this.waitBox = Utils.alert("There is already a job running <br/>\
                                                            Please wait until it is finished.\
                                                            ", "Download PDF");
                            }
                            //dlManager.continueDownload(length, button, 'PDF', true);
                        },
                        parameters: parameters
                    });


                    Submissions.sendWatchmanEvent('gridHeaderDownloadPDF');

                }
            }]};

            if(this.hasUpload()) {
              tbar.items.push({
                  itemId: 'uploadsButton',
                  text: 'Download All Uploads',
                  iconCls: 'uploadsButton',
                  handler: function(button) {
                      var selections = $this.grid.getSelectionModel().getSelections().map(function (item) { return item.id })
                      if (selections.length > 1) {
                          $this.downloadAllFiles(form, Utils.user.username, Utils.user.email, Object.toJSON(selections));
                      } else {
                          if ($this.downloadType === 'range') {
                              startDate = $this.startDate || "";
                              endDate = $this.endDate || "";
                              $this.downloadAllFiles(form, Utils.user.username, Utils.user.email, "", startDate, endDate);
                          } else {
                              $this.downloadAllFiles(form, Utils.user.username, Utils.user.email);
                          }
                      }

                      Submissions.sendWatchmanEvent('downloadAllUploads');
                  },
                  updateHidden: function() {
                      if (this.hidden && store.getCount() > 0) {
                          this.show();
                      } else if (!this.hidden && store.getCount() < 1) {
                          this.hide();
                      }
                  }
              });
            }
            tbar.items.push('->');
            
            //Only show 'Delete All' if user has edit permissions
            if(this.userCanEdit && !$this.publicListing) {
              tbar.items.push({
                text: $this.getDateRange() === 'all' ? 'Delete All'.locale() : 'Delete All in Range'.locale(),
                iconCls: 'deleteAll',
                handler: function () {
                  var warning = '';

                  $this.setDeleteType();
                  if ($this.deleteType == 'all') {
                    warning = 'You are about to delete all submissions and uploaded files.'.locale();
                    Submissions.sendWatchmanEvent('deleteAllSubmissionClicked');
                  } else if ($this.deleteType == 'selected') {
                    warning = 'You are about to delete all selected submissions and uploaded files.'.locale();
                    Submissions.sendWatchmanEvent('deleteSelectedSubmissionClicked');
                  } else if ($this.deleteType == 'range') {
                    warning = 'You are about to delete all submissions and uploaded files in current time range.'.locale();
                  }

                  
                  Utils.prompt('<img align="left" src="images/warning.png" style="margin:10px;"><div style="padding:16px 0 0;"><h3 style="font-size: 13px;margin: 0;padding: 0;">' + warning + '</h3>' + 'Please enter your password to proceed'.locale() + '</div>', "", "Delete All Submissions".locale(), function (value, button, clicked) {
                    if (clicked) {
                      var parameters = {
                        password: value,
                        action: 'deleteAllSubmissions',
                        formID: form,
                        startDate: $this.startDate || "",
                        endDate: $this.endDate || ""
                      }

                      if ($this.deleteType == 'selected') {
                        var selections = new Array();
                        ($A($this.grid.getSelectionModel().getSelections())).each(function (item) {
                          selections.push(item.id);
                        });
                        parameters['selections'] = Object.toJSON(selections);
                      }
                      Utils.Request({
                        parameters: parameters,
                        onSuccess: function () {
                          $this.bbar.doRefresh();
                        },
                        onFail: function (t) {
                          Utils.alert(t.error, 'Problem');
                        }
                      });
                    }
                  }, {
                    width: 400,
                    fieldType: 'password',
                    okText: 'Delete Submissions'.locale()
                  });
                }
              })
            }

          tbar.items.push('-', {
                text:'Larger Grid'.locale(),
                enableToggle : true,
                iconCls: 'largerGrid',
                toggleHandler: function(but, state){
                    
                    if(state){
                        $('submissions-grid').setStyle('height:980px');
                        $this.grid.setHeight(980);
                        $this.bbar.pageSize = 35;
                    }else{
                        $('submissions-grid').setStyle('height:450px');
                        $this.grid.setHeight(450);
                        $this.bbar.pageSize = 14;
                    }
                    $this.bbar.doRefresh();

                    Submissions.sendWatchmanEvent('expandGridVertical');
                }
          });




        if( this.publicListing ) {
            var tempbar = {items:[]};
            for( var i=0 in tbar.items ){
                var item = tbar.items[i];
                if( item.text != undefined && item.text === 'Delete All' ){
                } else {
                    if( typeof(item) != "function" ){
                        tempbar.items.push(item);
                    }
                }
            }
            tbar = tempbar;
        }
        
        if(standAlone){
            tbar = false;
        }
        
        cm.defaultSortable = true;
        var lastRowBody = false;
        var stateID = form + ((standAlone)? '-reports' : '-submissions');
        
        if (listID === '' && !$this.publicListing) {
            Ext.state.Manager.setProvider(new Ext.ux.state.HttpProvider({
                id: stateID,
                readUrl: 'server.php',
                saveUrl: 'server.php',
                readBaseParams: {
                    action: 'getSetting',
                    key: 'extGridState'
                },
                saveBaseParams: {
                    action: 'setSetting',
                    key: 'extGridState'
                },
                paramNames: {
                    id: 'identifier',
                    data: 'value',
                    name: 'grid-state',
                    value: 'value'
                },
                autoRead:false
            }));
            if ($this.data && $this.data.extGridState) {
                try{
                   Ext.state.Manager.getProvider().initState(Ext.decode($this.data.extGridState.value));
                }catch(e){
                   Ext.state.Manager.getProvider().initState([]);
                }
            }
        }

        $this.grid = new Ext.grid.GridPanel({
            renderTo: standAlone? false : 'submissions-grid',
            //width: !standAlone? 900 : "",
            height: !standAlone? 450 : "",
            //autoHeight: true,
            //autoScroll:true,
            store: store,
            stateId: stateID,
            // layout:{
            //         type:'fit',
            //         align:'stretch',
            //         pack:'start'
            // },
            stateful: (listID === '' && !$this.publicListing),
            //forceLayout:true,
            clicksToEdit:1,
            trackMouseOver:true,
            stripeRows: true,
            viewConfig: {
                forceFit: (standAlone) ? ( (!jQuery.isEmptyObject($this.gridSettings) && $this.gridSettings.gridAutoFit===true) ? true : false) : false,
                alternate:true,
                enableRowBody:true,
                resizable:true
            },
            listeners:{
                render: function(e){
                    if(!standAlone){ $('content-wrapper').show(); }
                }
            },
            cm: cm,
            loadMask: true,
            sm: new Ext.grid.RowSelectionModel({
                listeners:{
                    rowselect: function(sm, index, selected){
                        if(!standAlone && $('content-wrapper')){ $this.displayRowData(selected); }

                        $this.setDeleteType();
                        $this.setDownloadType();

                        //window.scrollTo(0,document.body.scrollHeight - 810);
                        //alert(document.body.scrollHeight);
                        $this.currentSelection = index;
                        /*
                        if(standAlone){
                            if(lastRowBody){ lastRowBody.hide(); }
                            
                            var rowBody = $(Submissions.grid.getView().getRow(index)).select('.x-grid3-row-body')[0];
                            
                            var dataDump = "<div style='padding:10px; overflow:auto; max-height:100px;'>";
                            $H(selected.data).each(function(pair){
                                var head = $this.getHeader(pair.key);
                                
                                if(!head){return; }
                                if(pair.key == "ip" || pair.key == "created_at"){ return; }
                                
                                //if(pair.value.length < 100){ return; }
                                
                                
                                dataDump+="<div style='margin:5px;' ><label style='clear:left;float:left; width:150px;'><b>"+head+"</b></label><div>"+pair.value+"</div></div>";
                            });
                            dataDump +="</div>";
                            lastRowBody = rowBody.update(dataDump).show();
                        }
                        */
                    }
                }
            }),
            tbar: tbar,
            bbar: $this.bbar = new Ext.PagingToolbar({
                pageSize: rpp,
                store: store,
                displayInfo: true,
                displayMsg: $this.data.itemname+' {0} - {1} of {2}',
                emptyMsg: "No %s to display".locale($this.data.itemname.locale()),
                items:['-',searchfield]
            })
        });
        
        if($this.publicListing){
            $this.hideShowGridColumn('new', true);
            $this.hideShowGridColumn('flag', true);
            $this.hideShowGridColumn('del', true);
        }

         //Do not show delete column if user does not have edit permissions
        if(!this.userCanEdit) {
          $this.hideShowGridColumn('del', true);
        }
        
        store.setDefaultSort('id', 'desc');
        $A($this.data.columns).each(function(e){
            e.width = parseInt(e.width, 10); 
        });
        
        var dateRange = this.getDateRange();
        if(dateRange != "custom") {
            this.setDateRange(dateRange);
        }else{
            var custom = this.getCustomDate();
            this.setDateRange(custom.start, custom.end);
        }

        if(standAlone){
            var vi = new Ext.Viewport({
                layout: 'fit',
                items: $this.grid 
            });
            //fit grid to report
            // var view = $this.grid.getView();
            // view['forceFit'] = true;
        }else{
            $this.grid.render();
        }

        var startRow = 0;
        // If there's submission ID in the URL, load that submission.
        if (document.get.submissionID) {
            this.getSubmissionIndex();
            startRow = Math.floor(Submissions.selectedSubmissionIndex / rpp) * rpp;
        }

        store.load({
            params: {
                startDate: this.startDate,
                endDate: this.endDate,
                start: startRow, 
                limit: rpp
            }, 
            callback: function() {
                var sid;
                if ((sid = document.get.submissionID)) {
                    var sm = Submissions.grid.getSelectionModel();
                    var submissionRow = Submissions.grid.store.find('submission_id', sid);
                    sm.selectRow(submissionRow);
                }
            }
        });
        
        $this.checkDropboxIntegration();
        $this.checkFTPIntegration(function(){
            if(document.readCookie('open-ftp-wizard') == 'yes'){
                $this.toggleSettings(); // First open preferences page
                $this.FTPIntegration(); // then open FTP wizard
                document.eraseCookie('open-ftp-wizard'); // then remove cookie to stop this behaviour
            }
        });
        }catch(err){
            console.error(err);
        }

        this.initComplete = true;
        Submissions.sendWatchmanEvent('appLoadedOnClient');
    },
    setDeleteType: function() {
        if($$('.deleteAll').length < 1){return;}
        var type = '';
        var selections = new Array();
        ($A(this.grid.getSelectionModel().getSelections())).each(function (item){selections.push(item.id);});
        if(selections.length > 1) {
            this.deleteType = 'selected';
            $$('.deleteAll')[0].update('Delete Selected Submissions'.locale());
        } else if(this.getDateRange() === 'all') {
            this.deleteType = 'all';
            $$('.deleteAll')[0].update('Delete All Submissions'.locale());
        } else {
            this.deleteType = 'range';
            $$('.deleteAll')[0].update('Delete Submissions in Time Range'.locale());
        }
    },
    setDownloadType: function() {
        if($$('.uploadsButton').length < 1){return;}
        var type = '';
        var selections = new Array();
        ($A(this.grid.getSelectionModel().getSelections())).each(function (item){selections.push(item.id);});
        if(selections.length > 1) {
            this.downloadType = 'selected';
            $$('.uploadsButton')[0].update('Download Selected Uploads'.locale());
        } else if(this.getDateRange() === 'all') {
            this.downloadType = 'all';
            $$('.uploadsButton')[0].update('Download All Uploads'.locale());
        } else {
            this.downloadType = 'range';
            $$('.uploadsButton')[0].update('Download Uploads in Time Range'.locale());
        }
    },
    checkFTPIntegration: function(callback){
        if(!$('submissions-grid')){return true;}
        Utils.Request({
            method: 'GET',
            parameters:{
                action:'getIntegration',
                type:'FTP',
                username: Utils.user.username,
                formID: this.data.formID,
                keys:'host,username,port,path,folder_field' 
            },
            onComplete: function(res){
                if(res.success){
                    Submissions.FTPIntegrated = true;
                    Submissions.FTPProps = res.values;
                }else{
                    Submissions.FTPIntegrated = false;
                }
                if(callback){ callback(); }
            }
        });
    },
    checkDropboxIntegration: function(){
        if(!$('submissions-grid')){return true;}
        Utils.Request({
            method: 'GET',
            parameters:{
                action:'getIntegration',
                type:'dropbox',
                username: Utils.user.username,
                formID: this.data.formID,
                keys:'folder_field' 
            },
            onComplete: function(res){
                if(res.success){
                    Submissions.dropboxIntegrated = true;
                    Submissions.dropboxFolderField = res.values.folder_field;
                }else{
                    Submissions.dropboxIntegrated = false;
                }
            }
        });
    },
    getSubmissionIndex: function() {
        var ss = Submissions.grid.store.getSortState();
        Utils.Request({
            server: Utils.HTTP_URL+"server.php",
            parameters: {
                action: "getSubmissionIndex",
                submissionID: document.get.submissionID,
                formID: this.data.formID,
                sortDir: ss.direction,
                sortField: ss.field
            },
            asynchronous: false,
            onSuccess: function(res){
                Submissions.selectedSubmissionIndex = parseInt(res.subIndex, 10);
            }
        });
    },
    downloadManager: {
        //init empty array
        currentDownload: new Array(),
        batchLimit: 20,
        waitBox: false,
        safetyFactor: {"Excel": 0.7, "CSV": 0.7},
        difficulty: 1000000, // 1 million cells limit [1 mil for OpenOffice, 2 mil for Google Spreadsheets]
        totalLength: new Array(),

        adjustBatch: function(type, columnCount, total) {
            var diff = false;
            var total = total || 10000;
            if(columnCount > 400) {
                diff = this.difficulty * 0.75;
            } else {
                diff = this.difficulty;
            }
            //use safety factor if downloads fail
            var limit = Math.ceil((diff*this.safetyFactor[type])/(columnCount*250)) * 200;
            if(limit > total) {
                limit = total;
            }
            this.batchLimit = limit;
            return this;
        },

        checkLength: function(length, button,type) {
            $this = this;
            maxLength = this.batchLimit;
            // No data
            if(!(length) || length < 1){
                Utils.alert('There is no data to export');
                return false;
            }
            if(type === 'PDF') {
                $this.waitBox = Utils.alert(('Preparing '+type+' files...Please wait').locale(), 'Download PDF'.locale());
                return true;
            }
            // Manage if over batch limit or submissions are changed
            if (length > maxLength && (this.totalLength[type] == null || this.totalLength[type] == length)) {
                //set total length to track changes
                this.totalLength[type] = length;
                //if not yet initialized
                if (this.currentDownload[type] == null)
                {
                    Utils.alert('You have total ' + length + ' submissions. <br/><br/> Since you have over ' + maxLength + ' submissions you will be downloading multiple \
                    ' + type + ' files each with ' + maxLength + ' submissions.','Download ' + type, 
                    function(){
                        $this.currentDownload[type] = 0;                                
                        $(button.id).click();              
                    },
                    {
                        okText: 'Start Download',
                        width: 500
                    });
                    return false;
                } else {
                    //download
                    $this.waitBox = Utils.alert('Preparing '+type+' file...Please wait','Download ' + type);                                                                         
                }
            } else {
                this.currentDownload[type] = null;
                this.totalLength[type] = null;
            }
            return true;
        }, continueDownload: function(length, button, type, retry) {
            //remove previous alert window
            if(this.waitBox)
                this.waitBox.close();
            //in case of failure, retry is true
            if(retry) {
                this.safetyFactor[type] *= 0.8;
                this.waitBox = Utils.alert('Downloading submissions between '+( this.currentDownload[type] || "0")+' and '+(this.currentDownload[type]+this.batchLimit)+' failed.',
                "Download "+type, 
                function(){                                                                     
                    $(button.id).click();
                },
                {
                    okText: 'Retry',
                    width: 400
                });
                return;
            }
            
            //increment current status   
            this.currentDownload[type] += this.batchLimit;
            // Completed
            if(this.currentDownload[type] >= length)
            {
                var msg = "Download complete".locale();
                if(type == "Uploads")
                    msg = "<div>Uploaded form files is ready.</div><div style='font-size:11px;color:#444;margin-top:6px;'>Max. 200 MB or 200 files.</div>";
                Utils.alert(msg,('Download '+ type).locale());
                this.currentDownload[type] = null;
            } 
            else
            { // Continue downloading
                this.waitBox = Utils.alert('Downloading submissions. Please be patient and do not continue downloading until the previous download begins.<br/> \
                Current : ' + this.currentDownload[type] + ' of ' + length,'Download '+type, 
                function(){                                                                     
                    $(button.id).click();
                },
                {
                    okText: 'Download Next Part',
                    width: 500
                });               
            }  
        }, trackPDFDownload: function(button, id) {
            //get cookie value
            function getCookie(name) {
                var parts = document.cookie.split(name + "=");
                if (parts.length == 2)
                    return parts.pop().split(";").shift();
            }

            function truncate(text, maxLength, separator) {
                maxLength = maxLength || 100;
                if(text.length > maxLength) {
                    separator = separator || "...";
                    var diff = text.length - maxLength;
                    var prefEnd = Math.floor((text.length - diff - separator.length) / 2);
                    var prefix = text.substr(0, prefEnd);
                    var suffix = text.substr(prefEnd + diff + separator.length);
                    return prefix + "..." + suffix;
                }
                return text;
            }

            var token = getCookie("downloadToken");
            //Remove cookie
            function removeCookie(name) {
                document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
            }
            removeCookie("downloadToken");
            if(id !== undefined){
                token = id;
            }
            var trackingTimer = setInterval(function(){
                Utils.Request({
                    method:'GET',
                    server: '/API/user/submissions/download/'+token ,
                    onComplete: function(response){
                        if(response.message === "success"){
                            if(response.content.status === "COMPLETED"){
                                clearInterval(trackingTimer);
                                button.setDisabled(false);
                                button.setText('PDF');
                                button.setIconClass('pdfButton');
                                var filesArray = response.content.url.split(',');
                                var msg = "";
                                for(var i = 0; i < filesArray.length; i++){
                                    msg += '<a href="'+filesArray[i]+'" target="_self" title="'+filesArray[i]+'">'+truncate(filesArray[i])+'</a><br/>';
                                }
                                this.waitBox = Utils.alert(msg, "Download PDF".locale(), "", {width: 700, noCenter: true, contentClass: 'download-pdf-box-content'});
                            } else if(response.content.status === "FAILED"){
                                clearInterval(trackingTimer);
                                this.waitBox = Utils.alert("Operation failed", "Download PDF");
                            } else if(response.content.status === "GENERATING"){
                                if (response.content.percentage) {
                                    if (document.getElementById("percentage") !== null){
                                        document.getElementById("percentage").textContent = response.content.percentage;
                                    } else {
                                        this.waitBox = Utils.alert("Preparing PDF files...".locale() + "<br/><br/>" + "Job Status: %".locale() + "<span id='percentage'>"+response.content.percentage+"</span>", "Download PDF".locale());
                                    }
                                }
                            }
                        }
                    }
                })
            }, 3000);
        }
    },
    downloadAllFiles: function (formID, username, email, selections, startDate, endDate){
        Utils.Request({
            method: 'GET',
            parameters: {
                action: 'exportData',
                formID: formID,
                type:'ATTACHMENTS',
                username: username,
                email: email,
                selections: selections,
                startDate: startDate,
                endDate: endDate
            },
            onFail: function(response){
                if(response.success === false) {
                    Utils.alert(response.error, "Download All Uploads");
                }
            },
            onSuccess: function(){
                Utils.alert("Your request have been received. We will send you an email when your data is ready for download.".locale(), "Download All Uploads".locale());
            }
        });
    },
    sendWatchmanEvent: function(action, target) {
        if (window.events && Utils.user) {
            var username = Utils.user.username;
            
            var resetInterval = function (){
              clearTimeout(Submissions.timer);
              Submissions.timer = setTimeout(function (){ 
                Submissions.isSessionReset = true;
              }, 300000);
            };
            
            if (Submissions.isSessionReset) {
              Submissions.isSessionReset = false;
              window.events.tick({ actor: username, action: 'appLoadedOnClient'});
            }
            
            resetInterval();

            window.events.tick({ actor: username, action: action, target: target });
        }
    },

    switchToNewVersion: function() {
      var self = this;
      var username = Utils.user.username;

      var targetUserSetting = '1';
      if (Utils.user.spreadsheets && Utils.user.spreadsheets === '4') {
        targetUserSetting = '3';
      }
      
      Utils.Request({
        method:'POST',
        server: '/API/user/settings',
        parameters:{
          spreadsheets: targetUserSetting
        },
        onComplete: function(res) {
          if (res.responseCode == '200') {
            window.location.href =  '/sheets/' + self.data.formID;
            Submissions.sendWatchmanEvent('switchToNewVersionClicked');
          }
        }
      });
    },

    chargeLaterHandler: function(data) {
            var gridButton = $$('#content-wrapper .chargeLaterButton em')[0];
            var listButton = $$('#submissions-grid .chargeLaterButton em');

            if (gridButton) { gridButton.addEventListener('click', handleClick.bind(this, data)) }
            if (listButton.length > 0) {
                listButton.forEach(function(button) {
                    button.addEventListener('click', handleClick.bind(this, data));
                });
            }

            function handleClick(data, e) {
                data.fullname = e.target.className;
                
                if(document.readCookie('dontShowChargeLaterDialog') != 'yes'){
                    Submissions.chargeLaterConfirm(data,function(value) {
                        if (value) {
                            var apiUrl = "/API/payment/authorization/capturePayment";
                            Submissions.chargeLaterRequest(apiUrl, data, e.target.parentNode);
                        }
                    });
                }
            }
    },

    chargeLaterConfirm: function(data, callback) {
        var dom = 
        '<span style="font-size:16px;">' +
            'Are you sure you want to confirm this payment?'.locale() +
        '</span><hr><span style="color:#555; font-size: 11px;">' +
        '"Charge Customer Now" button will be deleted if you confirm payment. Be careful, this process cannot be undone.'.locale() +
        '<div style="margin: 20px 0;">' +
            '<ul style="text-align: left">' +
                '<li><strong>Full Name: </strong>' + '<span>' + data.fullname + '</span></li>' + 
                '<li><strong>Product: </strong>' + '<span>' + data.product + '</span></li>' + 
                '<li><strong>Amount: </strong>' + '<span>' + data.amount + " " + data.currency + '</span></li>' + 
                '<li><strong>Date: </strong>' + '<span>' + data.date + '</span></li>' + 
                '<li><strong>Form ID: </strong>' + '<span>' + data.formId + '</span></li>' + 
                '<li><strong>Submission ID: </strong>' + '<span>' + data.sid + '</span></li>' + 
                '<li><strong>Transaction ID: </strong>' + '<a target="_self" href='+ data.dashboardURL +'>' + data.transactionId + '</a></li>' + 
            '</ul>' +
        '</div>' +
        '<div style="margin-top:10px">' +
            '<label><input type="checkbox" id="dontshowchargelater"> ' +
            "Don't show this message again.".locale() + 
            '</label>' +
        '</div>';
            // Display a dialog box by default
        Utils.confirm(dom, "Confirm Payment".locale(), function(but, value) {
            console.log("But:", but, "Value:", value);
            if(value){
                if($('dontshowchargelater').checked){
                    document.createCookie('dontShowChargeLaterDialog', 'yes');
                }
            }

            callback(value);
        });
    },

    chargeLaterRequest: function(url, params, button) {
        Utils.Request({
            parameters: {
                params: JSON.stringify({
                    formId: params.formId,
                    sid: params.sid,
                    qid: params.qid,
                    gateway: params.gateway
                })
            },
            server: url,
            method: 'POST',
            onSuccess: function(res){
                console.log(res);
                if (res.responseCode === 200) {
                    Utils.alert(res.content ||Â "Successfully charged", 'Success'.locale());
                    button.remove();
                    if ($$('.x-grid3-row-selected .chargeLaterButton')[0]) {
                        $$('.x-grid3-row-selected .chargeLaterButton')[0].remove();
                    }
                    if ($$('.form-all .chargeLaterButton')[0]) {
                        $$('.form-all .chargeLaterButton')[0].remove();
                    }
                }
            },
            onFail: function(res) {
                if(res.responseCode === 301) {
                    url = url.replace('api.', 'eu-api.');
                    Submissions.chargeLaterRequest(url, params);
                    return;
                }
                console.log(res);
                Utils.alert(res.content || 'Response returned with non-OK status', 'Error'.locale());
            },
        });
    }
};
