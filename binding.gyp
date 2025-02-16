{
  "targets": [
    {
      "target_name": "native_module",
      "sources": [
        "cpp/native-module.cpp"
      ],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")",
        "<(module_root_dir)/lib/eigen-3.4.0/"
      ],
      "cflags!": [
        "-fno-exceptions"
      ],
      "cflags_cc!": [
        "-fno-exceptions"
      ],
      "defines": [
        "NAPI_DISABLE_CPP_EXCEPTIONS"
      ],
      "msvs_settings": {
        "VCCLCompilerTool": {
          "AdditionalOptions": [
            "-std:c++17"
          ]
        }
      }
    },
    {
      "target_name": "alpha_shape_3d",
      "sources": [
        "cpp/alpha-shape-3d.cpp"
      ],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")",
        "<(module_root_dir)/lib/cgal-6.0.1/include/",
        "<(module_root_dir)/lib/cgal-6.0.1/auxiliary/gmp/include",
        "<(module_root_dir)/lib/boost-1.86.0/"
      ],
      "libraries": [
        "<(module_root_dir)/lib/cgal-6.0.1/auxiliary/gmp/lib/gmp.lib",
        "<(module_root_dir)/lib/cgal-6.0.1/auxiliary/gmp/lib/mpfr.lib"
      ],
      "cflags!": [
        "-fno-exceptions"
      ],
      "cflags_cc!": [
        "-fno-exceptions",
        "-O3",
        "-DNDEBUG"
      ],
      "defines": [
        "NAPI_DISABLE_CPP_EXCEPTIONS"
      ],
      "copies": [
        {
          "destination": "<(module_root_dir)/build/Release",
          "files": [
            "<(module_root_dir)/lib/cgal-6.0.1/auxiliary/gmp/bin/gmp-10.dll",
            "<(module_root_dir)/lib/cgal-6.0.1/auxiliary/gmp/bin/mpfr-6.dll"
          ]
        }
      ],
      "msvs_settings": {
        "VCCLCompilerTool": {
          "AdditionalOptions": [
            "-std:c++17",
            "/GR",
            "/EHsc"
          ]
        }
      }
    }
  ]
}