/***************** NAMESPACE *****************/

var EmojiPicker =
{
    //Emoji picker
	emoji_picker: new EmojiKeyboard,

    /********************************** INIT **********************************/

    emojiPickerInit: function()
	{
		// Chat setup
		this.emoji_picker.resizable = false;
		this.emoji_picker.default_placeholder = "Search an emoji...";
		this.emoji_picker.instantiate(document.get("#emoji-picker"));
		
		// Chat callback
        this.emoji_picker.callback = (emoji, closed) => {
            Casada.input.value += emoji.emoji;
        };

		// Event listeners
		for (const grid_element of document.get(".grid-layout").children)
		{
			if(grid_element.className != "grid-input") grid_element.when("click", this.hideEmojiPicker.bind(this));
		}
	},

    /********************************** TOOLS **********************************/

    hideEmojiPicker: function(event)
	{
		let emoji_main_div = document.getElementById("emojikb-maindiv");

		if(!emoji_main_div.classList.contains("emojikb-hidden"))
		{
			this.emoji_picker.toggle_window();
			Casada.input.focus();
		}
	}

}