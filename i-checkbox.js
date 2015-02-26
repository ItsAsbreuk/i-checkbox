module.exports = function (window) {
    "use strict";

    require('./css/i-checkbox.css');
    require('itags.core')(window);

    var itagName = 'i-checkbox', // <-- define your own itag-name here
        ITSA = window.ITSA,
        Event = ITSA.Event,
        laterSilent = ITSA.laterSilent,
        DEFAULT_ON_TEXT = 'I',
        DEFAULT_OFF_TEXT = 'O',
        SUPPRESS_DELAY = 50,
        INTERVAL_FONTCHANGE_CHECK = 350,
        Itag, IFormElement, registeredElements;

    if (!window.ITAGS[itagName]) {
        ITSA.DD.init();

        registeredElements = [];
        IFormElement = require('i-formelement')(window);

        Event.before(itagName+':manualfocus', function(e) {
            // the i-select itself is unfocussable, but its button is
            // we need to patch `manualfocus`,
            // which is emitted on node.focus()
            // a focus by userinteraction will always appear on the button itself
            // so we don't bother that
            var element = e.target;
            e.preventDefault();
            element.itagReady().then(
                function() {
                    var focusNode = element.getElement('>div');
                    focusNode && focusNode.focus(true, true);
                }
            );
        });

        Event.after('tap', function(e) {
            var element = e.target,
                model = element.model,
                focusNode;
            if (!element.hasData('_suppressTap')) {
                model.checked = !model.checked;
                focusNode = element.getElement('>div');
                focusNode.hasFocus() || focusNode.focus();
            }
        }, 'i-checkbox');

        Event.after('keypress', function(e) {
            var element = e.target,
                model = element.model;
            (e.charCode===32) && (model.checked=!model.checked);
        }, 'i-checkbox');

        Event.after('dd-drag', function(e) {
            var checkbox = e.target.inside('i-checkbox');
            checkbox.setData('_suppressTap', true);
        }, 'i-checkbox');

        Event.after('dd-drop', function(e) {
            var dragNode = e.target,
                checkbox = dragNode.inside('i-checkbox'),
                btnNode = dragNode.getElement('>.i-btn'),
                distance = btnNode.left - checkbox.left - checkbox.getData('_leftBorder') + Math.round(checkbox.getData('_height')/2);
            checkbox.model.checked = (distance>Math.round(checkbox.getData('_width')/2));
            checkbox._setUIState();
            laterSilent(function() {
                checkbox.removeData('_suppressTap');
            }, SUPPRESS_DELAY);
        }, 'i-checkbox');

        Event.defineEvent(itagName+':checkedchange')
             .unPreventable()
             .noRender();

        Event.after(itagName+':change', function(e) {
            var element = e.target,
                model = element.model;
            /**
            * Emitted when a the i-checkbox changes its `checked`-value
            *
            * @event i-checkbox:checkedchange
            * @param e {Object} eventobject including:
            * @param e.target {HtmlElement} the i-checkbox element
            * @param e.prevValue {Boolean}
            * @param e.newValue {Boolean}
            * @since 0.1
            */
            element.emit('checkedchange', {
                prevValue: !model.checked,
                newValue: model.checked
            });
        });

        // whenever fontsize changes, the calculated height needs to change
        // we have no means of listening to this - even it's unlikely to happen
        // yet we want the i-checkboxes to fit at anytime, so we set up a lazy timer
        // that checks all registered itag-instances
        laterSilent(function() {
            var len = registeredElements.length,
                i, element;
            for (i=0; i<len; i++) {
                element = registeredElements[i];
                if (!element.hasData('_suppressTap')) {
                    element._fitCheckbox();
                    element._setUIState();
                }
            }
        }, INTERVAL_FONTCHANGE_CHECK, true);

        Itag = IFormElement.subClass(itagName, {
            attrs: {
                checked: 'boolean',
                'reset-value': 'boolean'
            },

            init: function() {
                var element = this,
                    value = element.model.checked,
                    designNode = element.getDesignNode(),
                    options = designNode.getAll('>option');

                // set the reset-value to the inital-value in case `reset-value` was not present
                element.defineWhenUndefined('reset-value', value)
                       .defineWhenUndefined('on-text', options[0] ? options[0].getHTML() : DEFAULT_ON_TEXT)
                       .defineWhenUndefined('off-text', options[1] ? options[1].getHTML() : DEFAULT_OFF_TEXT);
                registeredElements.push(element);
            },

            render: function() {
                var element = this,
                    content, innerDiv, borderLeftWidth;

                content = '<div tabindex="0">'+
                              '<div class="i-constrain">'+
                                  '<div class="i-container" dd-draggable="true" dd-handle=".i-btn" constrain-selector=".i-constrain">'+
                                      '<div class="i-on">I</div>'+
                                      '<div class="i-off">O</div>'+
                                      '<div class="i-btn"></div>'+
                                  '</div>'+
                              '</div>'+
                          '</div>';
                element.setHTML(content);
                innerDiv = element.getElement('>div');
                borderLeftWidth = parseInt(innerDiv.getStyle('border-left-width'), 10);
                element.setData('_leftBorder', borderLeftWidth);
                element.setData('_vertBorders', parseInt(innerDiv.getStyle('border-top-width'), 10) + parseInt(innerDiv.getStyle('border-bottom-width'), 10));
                element.setData('_horBorders', borderLeftWidth + parseInt(innerDiv.getStyle('border-right-width'), 10));
            },

            _fitCheckbox: function() {
                var element = this,
                    // width = parseInt(element.getStyle('width'), 10),
                    // height = parseInt(element.getStyle('height'), 10),
                    width = element.offsetWidth,
                    height = element.offsetHeight,
                    innerDiv, constrainNode, innerNodes, halfHeight, shift;
                if ((width!==element.getData('_width')) || (height!==element.getData('_height'))) {
                    // the height that should be used by the innernodes, schould be decreased by the border-width
                    height -= element.getData('_vertBorders');
                    width -= element.getData('_horBorders');
                    innerDiv = element.getElement('>div');
                    constrainNode = innerDiv.getElement('>div');
                    innerNodes = constrainNode.getAll('>div >div');
                    halfHeight = Math.round(height/2);
                    shift = 3*Math.round(height/4);
                    innerDiv.setInlineStyle('border-radius', height+'px');
                    constrainNode.setInlineStyles([
                        {property: 'left', value: (height-width)+'px'},
                        {property: 'width', value: (3*width-height)+'px'}
                    ]);
                    innerNodes[0].setInlineStyles([
                        {property: 'border-radius', value: height+'px'},
                        {property: 'line-height', value: (height-2)+'px'}, // correct with 2px: the padding-top of i-on
                        {property: 'padding-right', value: shift+'px'},
                        {property: 'width', value: width+'px'}
                    ]);
                    innerNodes[1].setInlineStyles([
                        {property: 'border-radius', value: height+'px'},
                        {property: 'margin-left', value: -height+'px'},
                        {property: 'line-height', value: (height-2)+'px'}, // correct with 2px: the padding-top of i-off
                        {property: 'padding-left', value: shift+'px'},
                        {property: 'width', value: width+'px'}
                    ]);
                    innerNodes[2].setInlineStyles([
                        {property: 'left', value: -width+'px'},
                        {property: 'height', value: height+'px'},
                        {property: 'width', value: height+'px'}
                    ]);
                    element.setData('_width', width);
                    element.setData('_height', height);
                }
            },

            _setUIState: function() {
                var element = this,
                    container = element.getElement('>div >div >div'),
                    newValue = element.model.checked ? (element.getData('_width')-element.getData('_height'))+'px' : '0';
                (container.getInlineStyle('left')===newValue) || container.setInlineStyle('left', newValue);
            },

            sync: function() {
                var element = this,
                    container = element.getElement('>div >div >div'),
                    itemContainers = container.getAll('>div'),
                    model = element.model;
                element._fitCheckbox();
                element._setUIState(model.checked);
                itemContainers[0].setHTML(model['on-text']);
                itemContainers[1].setHTML(model['off-text']);
            },

            currentToReset: function() {
                var model = this.model;
                model['reset-value'] = model.checked;
            },

            reset: function() {
                var model = this.model;
                model.checked = model['reset-value'];
                // no need to call `refreshItags` --> the reset()-method doesn't come out of the blue
                // so, the eventsystem will refresh it afterwards
            },

            destroy: function() {
                registeredElements.remove(this);
            }
        });

        window.ITAGS[itagName] = Itag;
    }

    return window.ITAGS[itagName];
};
