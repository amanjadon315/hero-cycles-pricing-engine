Assumptions, Questions, and Design Notes: Questions I Would Ask Before Building This in Production While working on the assignment, I noticed a few things that I'd need to discuss with a product manager before attempting to deploy this to production. Since I couldn't ask a stakeholders directly, I wrote out these assumptions that this solution is based on. 

What should happen to existing quotations when part prices change?

This is the question I consider the most important since this is something that would have to go into the data model for this. 

For example if a tyre is Rs200 in Jan, and is now Rs230 in Dec, what would happen to a quotation for that tyre generated in Jan. I would assume no change would happen and the same prices will apply until the quotation is replaced. 

Can salespeople build completely custom cycles?

It seems like you could configure completely unique bikes but there are constraints listed in the prompt, that I would confirm before going further. 

If it seems like you can only select pre-defined components, they should be linked to existing models. 

Is any one allowed to update pricing?

There are not roles for this system as mentioned, but it is obvious a salesperson should not have full control of the prices. In production, only specific employees or roles would have access to these administrative functions I believe the intent was to have a simpler solution. 

Does pricing vary by dealer/region/order volume?

Again similar to question 1, as we're unaware of how the prices differ it's assumed that the prices should be universal Does the problem take in account of tax in pricing calculations? For the purposes of this project I would assume the price listed should be a price before tax since there is not explicit tax handling in the prompt. What happens to part that is discontinued? 

I would assume you do not want to get rid of data of past orders for such configurations I do not believe that inventory plays role in any of this. 

Assumptions Made Saved quotations use snapshot pricing Saved quotations will have price stored for it at the time of creation. Future prices will not update previously quoted prices. Salespersons can only select predefined components in configuration The quotations will have to relate to the available cycle models, as each cycle model has it's own frame, gear-sets, and tyre sizes. Model has pre-defined quantities for certain parts In some cases such as tyres, a certain quantity of the component needs to be applied to be considered for configuration. 

Such as a bike would always use two tyres. 

Authentication is out of scope since it does not really apply to the main use case of the application. We can assume all quotations are created and accessed by authorized personnel(in a real scenario we would have role based access). Currency is in INR The price data, and all currency values used, is in INR with standard indian number format. Pricing is updated via administrative means Only authorized personnel should have permission to edit prices on any parts. 

Prices can only be updated to a new value, and cannot have price changed with any conditions such as discounts. Models may have a base cost A price for a cycle will include, at the very least, the price of all configured components but could possibly include additional flat rate assembly and manufacturing costs. Design Decisions Why I chose snapshot pricing Snapshot pricing ensures that the price quoted is the price that the customer will have to pay regardless of how the underlying price list may change. 

Why the pricing engine is isolated from the API layer This allows the application to be more easily tested and for the pricing logic to be repurposed easily. 

If we decide to store our pricing data in a different method than we did in this exercise it will still be easy to integrate. Why I prioritized simplicity The problem statement for this task seemed to aim at assessing how I would go about approaching this problem in the given time frame. By simplifying I aimed to focus on the most critical aspect of the assignment. If I Had More Time Authentication for the sales representatives PDF quotation generation Administer's ability to set up and manage models and their available slots. Ability to import pricing via CSV. Ability to undo pricing changes or view a change log. 

Inventory level management to restrict quotations to only parts available.