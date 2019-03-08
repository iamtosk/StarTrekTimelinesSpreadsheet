{
    "targets": [
        {
            "target_name": "NativeExtension",
            "sources": [ "NativeExtension.cpp", "VoyageCalculator.cpp", "ThreadPool.cpp", "VoyageCrewRanker.cpp" ],
            "xcode_settings": { "OTHER_CFLAGS": [ "-std=c++1z" ] },
            "include_dirs" : [
 	 			"<!(node -e \"require('nan')\")"
			]
        }
    ],
}