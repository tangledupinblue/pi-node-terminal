module.exports.CONNECTION_ERROR = "Connection Issue";

//comms classes
module.exports.MethodInvocation = function MethodInvocation(callName, serviceType) {
	var self=this;
	self.MemberName = callName;
	self.ServiceType = serviceType;
	//self.DateSubmitted = new Date();
	//self.DateReceived = new Date();
	self.ParameterValues = [];
	self.TimeStamp = +new Date();
}

module.exports.ScanResult = function ScanResult(){
	var self=this;
	self.Success=false;
	self.Message='';
	self.ErrorMessage='';
	self.ErrorClass='';
	self.DisplayMessage='';
}

/*
module.exports.ScanDetails = function ScanDetails(){
	var self = this;	
	self.Call = '';
}
*/
